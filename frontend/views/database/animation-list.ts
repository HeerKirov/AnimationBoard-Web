function createAnimationListVue(selectName: string, location: {mode: string, tab: string, id: number, page: number}) {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const webURL = window['webURL']

    const SORT_CHOICE = [
        {value: 'publish_time', title: '发布时间'},
        {value: 'create_time', title: '创建时间'},
        {value: 'update_time', title: '修改时间'},
        {value: 'title', title: '标题顺序'},
        {value: 'limit_level', title: '限制分级'},
    ]
    const PUBLISH_TYPE_CHOICE = [
        {value: 'GENERAL', title: 'TV & Web'},
        {value: 'MOVIE', title: '剧场版动画'},
        {value: 'OVA', title: 'OVA & OAD'},
    ]
    const ORIGINAL_WORK_TYPE_CHOICE = [
        {value: 'NOVEL', title: '小说'},
        {value: 'MANGA', title: '漫画'},
        {value: 'GAME', title: '游戏'},
        {value: 'ORI', title: '原创'},
        {value: 'OTHER', title: '其他'},
    ]
    const LIMIT_LEVEL_CHOICE = [
        {value: 'ALL', title: '全年龄'},
        {value: 'R12', title: 'R12'},
        {value: 'R15', title: 'R15'},
        {value: 'R17', title: 'R17'},
        {value: 'R18', title: 'R18'},
        {value: 'R18G', title: 'R18G'},
    ]

    function generateJoinArray(arr: string[]): string {
        if(arr && arr.length > 0) {
            let ret = '', first = true
            for(let s of arr) {
                if(first) first = false
                else ret += ' '
                ret += s
            }
            return ret
        }
        return null
    }

    let vm = new Vue({
        el: selectName,
        data: {
            filter: {
                show: false,
                searchText: '',
                publishType: ' ',
                originalWorkType: ' ',
                limitLevel: ' ',
                tags: []
            },
            sort: {
                title: SORT_CHOICE[0].title,
                by: 0,
                desc: true
            },
            pagination: {
                pageIndex: 1,   //当前页码
                pageLimit: 10,   //每页的最大条目数量
                count: 0,       //当前项目在数据库中的总数量
                maxPageIndex: 1,//计算得到的最大页码数
                navigator: []   //生成的页码方案，方便绑定直接跳转页码
            },
            data: []
        },
        computed: {
            sortChoices() {
                return SORT_CHOICE
            },
            publishTypeChoices() {
                return PUBLISH_TYPE_CHOICE
            },
            originalWorkTypeChoices() {
                return ORIGINAL_WORK_TYPE_CHOICE
            },
            limitLevelChoices() {
                return LIMIT_LEVEL_CHOICE
            },
            isStaff() {
                return window['vms']['top-bar'].profile.is_staff
            }
        },
        methods: {
            //系统事件
            load() {
                //TODO 更新标签待选列表
                this.query()
            },
            leave() {

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
            pageTo(pageIndex: number | 'first' | 'prev' | 'next' | 'last') {
                let goal
                if(pageIndex === 'first') {
                    goal = 1
                }else if(pageIndex === 'prev') {
                    goal = this.pagination.pageIndex > 1 ? this.pagination.pageIndex - 1 : 1
                }else if(pageIndex === 'next') {
                    goal = this.pagination.pageIndex < this.pagination.maxPageIndex ? this.pagination.pageIndex + 1 : this.pagination.maxPageIndex
                }else if(pageIndex === 'last') {
                    goal = this.pagination.maxPageIndex
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
            //处理逻辑
            query() {
                let params = {
                    original_work_type: this.filter.originalWorkType.trim() || undefined,
                    publish_type: this.filter.publishType.trim() || undefined,
                    limit_level: this.filter.limitLevel.trim() || undefined,
                    search: this.filter.searchText.trim() || undefined,
                    tags_name: generateJoinArray(this.filter.tags) || undefined,
                    ordering: `${this.sort.desc ? '-' : ''}${SORT_CHOICE[this.sort.by].value}`,
                    limit: this.pagination.pageLimit,
                    offset: (this.pagination.pageIndex - 1) * this.pagination.pageLimit
                }
                client.database.animations.list(params, (ok, s, d) => {
                    if(ok) {
                        if('results' in d && 'count' in d) {
                            this.data = d['results']
                            this.pagination.count = d['count']
                        }else{
                            this.data = d
                            this.pagination.count = d.length
                        }
                        this.generatePaginationNavigator()
                    }else{
                        //TODO 错误面板
                        console.warn(`ERROR ${s}: ${d}`)
                    }
                })
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
            }
        }
    })
    return vm
}