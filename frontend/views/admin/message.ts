(function () {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const webURL = window['webURL']
    const serverURL = window['serverURL']

    const PAGE_LIMIT_IN_TABLE = 20

    function formatDateMinuteToStr(datetime: Date): string {
        if (!datetime) return null
        let year   = datetime.getFullYear()
        let month  = datetime.getMonth() + 1
        let day    = datetime.getDate()
        let hour   = datetime.getHours()
        let minute = datetime.getMinutes()

        function fmt(n) {return n < 10 ? `0${n}` : n}

        return `${year}-${fmt(month)}-${fmt(day)} ${fmt(hour)}:${fmt(minute)}`
    }

    let vm = new Vue({
        el: '#main',
        data: {
            pagination: {
                pageIndex: 1,
                pageLimit: PAGE_LIMIT_IN_TABLE,
                count: 0,
                maxPageIndex: 1,
                navigator: []
            },
            filter: {
                owner: null,
                read: 'NONE',
            },
            items: [],
            ui: {
                loading: false,
                errorInfo: null,

                users: []
            },
            creator: {
                loading: false,
                errorInfo: null,

                owner: null,
                content: ''
            }
        },
        methods: {
            requestForList() {
                if(this.filter.owner != null) {
                    this.ui.loading = true
                    client.admin.systemMessages.list({
                        ordering: '-create_time',
                        owner__username: this.filter.owner,
                        read: this.filter.read === 'NONE' ? undefined : this.filter.read,
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
                }
            },
            format(data: any[]): any[] {
                let ret = []
                for(let item of data) {
                    ret[ret.length] = {
                        content: item.content.content,
                        read: item.read,
                        createTime: new Date(item.create_time)
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
            requestForUsers() {
                client.admin.users.list({ordering: 'create_time'}, (ok, s, d) => {
                    if(ok) {
                        let users = []
                        for(let item of d) {
                            users[users.length] = {
                                username: item.username,
                                name: item.name
                            }
                        }
                        this.ui.users = users
                    }
                })
            },
            //UI
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
            openCreator() {
                $('#creator #owner-picker').dropdown('clear')
                this.creator.loading = false
                this.creator.errorInfo = null
                this.creator.owner = null
                this.creator.content = ''
                $('#creator').modal('show')
            },
            create() {
                if(this.creator.owner != null && this.creator.content) {
                    this.creator.loading = true
                    client.admin.systemMessages.create({owner: this.creator.owner, system_message_content: this.creator.content}, (ok, s) => {
                        if(ok) {
                            this.requestForList()
                            $('#creator').modal('hide')
                        }else{
                            this.creator.errorInfo = s === 400 ? '请求的格式存在意料之外的错误。' :
                                                    s === 401 || s === 403 ? '没有权限。' :
                                                    s === 404 ? '找不到资源。' :
                                                    s === 500 ? '内部服务器错误。' : '网络连接发生错误。'
                        }
                        this.creator.loading = false
                    })
                }
            },
            //辅助函数
            fmtStdDate(date: Date): string {
                if(date) {
                    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours() < 10 ? '0' : ''}${date.getHours()}:${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}`
                }else{
                    return null
                }
            },
        },
        created() {
            this.requestForUsers()
        }
    })

    $('#main .ui.dropdown.dropdown-menu').dropdown({action: 'hide'})
    $('#main .ui.dropdown.dropdown-select').dropdown({fullTextSearch: true})
    $('#creator').modal({duration: 200, centered: false})

    window['vms']['main'] = vm
})()