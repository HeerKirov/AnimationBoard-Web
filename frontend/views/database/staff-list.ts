function createStaffListVue(selectName: string, location: {mode: string, tab: string, id: number | string}) {
    const Vue = window['Vue']
    const client = window['client']

    const PAGE_LIMIT_IN_TABLE = 20
    const SORT_CHOICE = [
        {value: 'create_time', title: '创建时间'},
        {value: 'update_time', title: '更新时间'},
        {value: 'name', title: '名称顺序'}
    ]
    const FILTER_CHOICE = [
        {value: 'all', title: '全部'},
        {value: 'org', title: '仅组织'},
        {value: 'person', title: '仅人员'},
    ]
    let vm = new Vue({
        el: selectName,
        data: {
            filter: {
                searchText: '',
                title: '',
                by: 0
            },
            sort: {
                title: SORT_CHOICE[0].title,
                by: 0,
                desc: true
            },
            pagination: {
                pageIndex: null,
                pageLimit: PAGE_LIMIT_IN_TABLE,
                count: 0,
                maxPageIndex: 1,
                navigator: []
            },
            data: [],
            panel: {
                loading: false,
                errorInfo: null
            }
        },
        computed: {
            sortChoices() {
                return SORT_CHOICE
            },
            filterChoices() {
                return FILTER_CHOICE
            },
            isStaff() {
                return window['vms']['top-bar'].profile.is_staff
            }
        },
        methods: {
            load() {
                this.panel.errorInfo = null
                this.panel.loading = false
                this.query()
            },
            leave() {},
            //处理逻辑
            query() {
                this.panel.loading = true
                client.database.staffs.list({
                    search: this.filter.searchText.trim() || undefined,
                    is_organization: FILTER_CHOICE[this.filter.by].value === 'org' ? true : FILTER_CHOICE[this.filter.by].value === 'person' ? false : undefined,
                    ordering: `${this.sort.desc ? '-' : ''}${SORT_CHOICE[this.sort.by].value}`,
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
                        this.data = this.format(data)
                        this.pagination.count = count
                        this.generatePaginationNavigator()
                    }else{
                        this.panel.errorInfo = s === 400 ? '数据获取格式发生错误。' :
                                                s === 401 ? '未登录。请首先登录以获取权限。' :
                                                s === 403 ? '您的账户不具备当前操作的权限。' :
                                                s === 404 ? '未找到服务器地址。' :
                                                s === 500 ? '服务器发生未知的内部错误。' :
                                                s == null ? '无法连接到服务器。' :
                                                '发生未知的网络错误。'
                    }
                    this.panel.loading = false
                })
            },
            format(data: any[]): any[] {
                return data
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
            //控件事件
            sortBy(by: number) {
                if(by === this.sort.by) {
                    this.sort.desc = !this.sort.desc
                }else{
                    this.sort.by = by
                    this.sort.title = SORT_CHOICE[by].title
                }
                this.query()
            },
            filterBy(by: number) {
                if(by != this.filter.by) {
                    this.filter.by = by
                    this.filter.title = FILTER_CHOICE[by].value === 'all' ? "" : FILTER_CHOICE[by].title
                    this.query()
                }
            },
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
                    this.query()
                }
            },
            //与构建有关的辅助函数
            staffDetailURL(tag: string): string {
                return `#/staffs/detail/${encodeURIComponent(tag)}/`
            },
        }
    })

    return vm
}