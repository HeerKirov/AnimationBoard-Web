(function () {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const webURL = window['webURL']
    const serverURL = window['serverURL']

    const PAGE_LIMIT_IN_TABLE = 20
    const SORT_CHOICE = [
        {value: 'create_time', title: '创建时间'},
        {value: 'last_login_time', title: '最后登录'},
    ]
    const CREATE_PATH_ENUM = {
        REGISTER: '开放注册',
        ACTIVATE: '注册码',
        ADMIN: '管理员',
        SYS: '系统'
    }

    let vm = new Vue({
        el: '#main',
        data: {
            profile: {
                isAuthenticated: null,
                isStaff: null,
                isSuperuser: null
            },
            pagination: {
                pageIndex: 1,   //当前页码
                pageLimit: PAGE_LIMIT_IN_TABLE,     //每页的最大条目数量
                count: 0,          //当前项目在数据库中的总数量
                maxPageIndex: 1,   //计算得到的最大页码数
                navigator: []      //生成的页码方案，方便绑定直接跳转页码
            },
            sort: {
                title: SORT_CHOICE[0].title,
                by: 0,
                desc: true
            },
            filter: {
                search: ''
            },
            ui: {
                loading: false,
                errorInfo: null
            },
            editor: {
                username: null,
                name: null,

                password: '',
                check: '',
                isStaff: null,
                refreshToken: false,

                checkError: null
            },
            items: []
        },
        computed: {
            sortChoices() {
                return SORT_CHOICE
            },
            createPathEnums() {
                return CREATE_PATH_ENUM
            },
            createPathIconEnums() {
                return {
                    REGISTER: 'registered',
                    ACTIVATE: 'key',
                    ADMIN: 'user plus',
                    SYS: 'code'
                }
            }
        },
        methods: {
            //数据逻辑
            requestForList() {
                this.ui.loading = true
                client.admin.users.list({
                    search: this.filter.search.trim(),
                    ordering: `${this.sort.desc ? "-" : ""}${SORT_CHOICE[this.sort.by].value}`,
                    limit: this.pagination.pageLimit,
                    offset: (this.pagination.pageIndex - 1) * this.pagination.pageLimit
                }, (ok, s, d) => {
                    if(ok) {
                        let data, count
                        if('results' in d && 'count' in d) {
                            data = d['results']
                            count = d['count']
                        }else{
                            data = d
                            count = d.length
                        }
                        this.items = this.format(data)
                        this.pagination.count = count
                        this.generatePaginationNavigator()
                    }else{
                        this.ui.errorInfo = s === 400 ? '数据获取格式发生错误。' :
                                            s === 401 ? '未登录。请首先登录以获取权限。' :
                                            s === 403 ? '您的账户不具备当前操作的权限。' :
                                            s === 404 ? '未找到服务器地址。' :
                                            s === 500 ? '服务器发生未知的内部错误。' :
                                            s == null ? '无法连接到服务器。' : '发生未知的网络错误。'
                    }
                    this.ui.loading = false
                })
            },
            format(data: any[]): any[] {
                let ret = []
                for(let item of data) {
                    ret[ret.length] = {
                        username: item.username,
                        name: item.name,
                        lastLoginTime: item.last_login_time ? new Date(item.last_login_time) : null,
                        lastLoginIp: item.last_login_ip,
                        createTime: new Date(item.create_time),
                        createPath: item.create_path,
                        permission: item.is_superuser ? 'SUPERUSER' : item.is_staff ? 'STAFF' : null,
                        editable: (item.is_superuser ? 2 : item.is_staff ? 1 : 0) < (this.profile.isSuperuser ? 2 : this.profile.isStaff ? 1 : 0)
                    }
                }
                return ret
            },
            generatePaginationNavigator() {
                this.pagination.maxPageIndex = Math.ceil(this.pagination.count / this.pagination.pageLimit)
                //处理导航器的页码分布
                if(this.pagination.maxPageIndex > 1 || this.pagination.pageIndex > this.pagination.maxPageIndex) {
                    const MAX_COUNT = 7
                    let first = this.pagination.pageIndex - Math.floor(MAX_COUNT / 2)
                    if(first + MAX_COUNT > this.pagination.maxPageIndex) {
                        first = this.pagination.maxPageIndex - MAX_COUNT + 1
                    }
                    if(first < 1) {
                        first = 1
                    }
                    let last = first + MAX_COUNT > this.pagination.maxPageIndex ? this.pagination.maxPageIndex : first + MAX_COUNT - 1
                    let arr = []
                    for(let i = first; i <= last; ++i) {
                        arr[arr.length] = i
                    }
                    this.pagination.navigator = arr
                }
            },

            saveEditor() {
                let ok = true
                let data = {}
                if(this.profile.isSuperuser) {
                    data['is_staff'] = this.editor.isStaff
                }
                if(this.editor.password) {
                    if(this.editor.check !== this.editor.password) {
                        ok = false
                        this.editor.checkError = '两次输入的密码不一致。'
                    }else{
                        data['password'] = this.editor.password
                    }
                }
                if(ok) {
                    let username = this.editor.username
                    client.admin.userPermissions.update(username, data, (ok, s, d) => {
                        if(ok) {
                            for(let item of this.items) {
                                if(item.username === username) {
                                    item.permission = data['is_staff'] ? 'STAFF' : null
                                    break
                                }
                            }
                        }else if(s != null) {
                            alert(`编辑失败。错误代码：${s}`)
                        }else{
                            alert('网络连接发生错误。')
                        }
                    })
                }
                return ok
            },
            resetToken() {
                $('#token-reset').modal('hide')
                client.user.refreshToken.post({username: this.editor.username}, (ok, s) => {
                    if(!ok) {
                        if(s != null) alert(`重置失败。错误代码：${s}`)
                        else alert('重置失败。网络连接发生错误。')
                    }
                })
            },
            //UI逻辑
            pageTo(pageIndex: number | 'first' | 'prev' | 'next' | 'last') {
                let goal
                if(pageIndex === 'first') {
                    goal = 1
                }else if(pageIndex === 'prev') {
                    goal = this.pagination.pageIndex > 1 ? this.pagination.pageIndex - 1 : 1
                }else if(pageIndex === 'next') {
                    goal = this.pagination.pageIndex < this.pagination.maxPageIndex ? this.pagination.pageIndex + 1 :
                        this.pagination.maxPageIndex > 0 ? this.pagination.maxPageIndex : 1
                }else if(pageIndex === 'last') {
                    goal = this.pagination.maxPageIndex > 0 ? this.pagination.maxPageIndex : 1
                }else if(typeof pageIndex === 'string') {
                    goal = parseInt(pageIndex)
                }else if(typeof pageIndex === 'number') {
                    goal = pageIndex
                }else{
                    goal = null
                }
                if(goal != null && goal !== this.pagination.pageIndex) {
                    this.pagination.pageIndex = goal
                    this.requestForList()
                }
            },
            sortBy(index: number) {
                if(index === this.sort.by) {
                    this.sort.desc = !this.sort.desc
                }else{
                    this.sort.by = index
                    this.sort.title = SORT_CHOICE[index].title
                }
                this.requestForList()
            },
            showEditor(index: number) {
                let item = this.items[index]
                this.editor.username = item.username
                this.editor.name = item.name
                this.editor.password = ''
                this.editor.check = ''
                this.editor.isStaff = item.permission != null
                this.editor.refreshToken = false
                this.editor.passwordError = null
                this.editor.checkError = null
                $('#editor').modal('show')
            },
            showTokenReset(index: number) {
                let item = this.items[index]
                this.editor.username = item.username
                this.editor.name = item.name
                $('#token-reset').modal('show')
            },
            //辅助函数
            loginRecord(item: any): string {
                if(item.lastLoginTime) {
                    return `${this.fmtStdDate(item.lastLoginTime)} (${item.lastLoginIp})`
                }else{
                    return null
                }
            },
            fmtStdDate(date: Date): string {
                if(date) {
                    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours() < 10 ? '0' : ''}${date.getHours()}:${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}`
                }else{
                    return null
                }
            },
        },
        created() {
            this.ui.loading = true
            window['vms']['top-bar'].delegateOnProfile((profile) => {
                this.profile.isAuthenticated = profile.is_authenticated
                this.profile.isStaff = profile.is_staff
                this.profile.isSuperuser = profile.is_superuser
                this.requestForList()
            })
        }
    })

    $('#main .ui.dropdown.dropdown-menu').dropdown({action: 'hide'})
    $('#main .ui.dropdown.dropdown-select').dropdown({fullTextSearch: true})
    $('#editor').modal({
        duration: 200,
        centered: false,
        onApprove() {
            return vm.saveEditor()
        }
    })
    $('#token-reset').modal({
        duration: 200,
        centered: false
    })

    window['vms']['main'] = vm
})()