function createAnimationListVue(selectName: string, location: {mode: string, tab: string, id: number | string, params: Object}) {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const prefix = window['prefix'] || ''
    const serverURL = window['serverURL']

    const PAGE_LIMIT_IN_TABLE = 20
    const NO_COVER_URL = `${window['staticURL']}/images/no_cover.jpg`
    const SORT_CHOICE = [
        {value: 'publish_time', title: '发布时间'},
        {value: 'create_time', title: '创建时间'},
        {value: 'update_time', title: '更新时间'},
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
                tags: [],
                tagsList: []
            },
            sort: {
                title: SORT_CHOICE[0].title,
                by: 0,
                desc: true
            },
            pagination: {
                pageIndex: null,   //当前页码
                pageLimit: PAGE_LIMIT_IN_TABLE,     //每页的最大条目数量
                count: 0,          //当前项目在数据库中的总数量
                maxPageIndex: 1,   //计算得到的最大页码数
                navigator: []      //生成的页码方案，方便绑定直接跳转页码
            },
            data: [],
            view: {
                toggleOn: false,
                detailOn: true,
                detailMode: 'OVERVIEW',
                detailModeTitle: '概览',
                simpleCard: false
            },
            panel: {
                loading: false,
                errorInfo: null
            }
        },
        computed: {
            sortChoices() {
                return SORT_CHOICE
            },
            publishTypeChoices() {
                return PUBLISH_TYPE_CHOICE
            },
            publishTypeEnums() {
                let ret = {}
                for(let {value, title} of PUBLISH_TYPE_CHOICE) {
                    ret[value] = title
                }
                return ret
            },
            originalWorkTypeChoices() {
                return ORIGINAL_WORK_TYPE_CHOICE
            },
            originalWorkTypeEnums() {
                let ret = {}
                for(let {value, title} of ORIGINAL_WORK_TYPE_CHOICE) {
                    ret[value] = title
                }
                return ret
            },
            limitLevelChoices() {
                return LIMIT_LEVEL_CHOICE
            },
            limitLevelEnums() {
                let ret = {}
                for(let {value, title} of LIMIT_LEVEL_CHOICE) {
                    ret[value] = title
                }
                return ret
            },
            isStaff() {
                return window['vms']['top-bar'].profile.is_staff
            }
        },
        watch: {
            'view.detailOn': function (val) {
                window.localStorage[`${prefix}animation-list.view.detail-on`] = val
            },
            'view.detailMode': function (val) {
                window.localStorage[`${prefix}animation-list.view.detail-mode`] = val
            }
        },
        methods: {
            //系统事件
            load(params?: Object) {
                if(params) this.analyseHashParameters(params)
                this.panel.errorInfo = null
                this.panel.loading = true
                this.query()
                this.updateTagList()
            },
            refresh() {},
            leave() {},
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
            //处理逻辑
            analyseHashParameters(params) {
                if(params['tags']) {
                    let picker = $('#animation-list #filter-tags-picker')
                    picker.dropdown('clear')
                    this.filter.tags = []
                    for(let tag of params['tags']) {
                        picker.dropdown('set selected', tag)
                    }
                }
                if(params['search']) {
                    this.filter.searchText = params['search']
                }
            },
            query() {
                this.panel.loading = true
                let params = {
                    original_work_type: this.filter.originalWorkType.trim() || undefined,
                    publish_type: this.filter.publishType.trim() || undefined,
                    limit_level: this.filter.limitLevel.trim() || undefined,
                    search: this.filter.searchText.trim() || undefined,
                    tags__name: generateJoinArray(this.filter.tags) || undefined,
                    ordering: `${this.sort.desc ? '-' : ''}${SORT_CHOICE[this.sort.by].value}`,
                    limit: this.pagination.pageLimit,
                    offset: (this.pagination.pageIndex - 1) * this.pagination.pageLimit
                }
                client.database.animations.list(params, (ok, s, d) => {
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
                for(let d of data) {
                    if('staff_info' in d) {
                        let staffInfo = d['staff_info']
                        let newStaffInfo = {}
                        for(let info of staffInfo) {
                            if(info && 'id' in info && 'name' in info) {
                                newStaffInfo[info.id] = info
                            }
                        }
                        d['staff_info'] = newStaffInfo
                    }
                    if('cover' in d) {
                        let cover = d['cover']
                        if(cover) {
                            d['cover'] = `${serverURL}/static/cover/${cover}`
                        }else{
                            d['cover'] = NO_COVER_URL
                        }
                    }
                }
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
            updateTagList() {
                client.database.tags.list({ordering: 'id'}, (ok, s, d) => {
                    if(ok) {
                        let tagsList = []
                        for(let tag of d) {
                            tagsList[tagsList.length] = {
                                id: tag.id,
                                name: tag.name
                            }
                        }
                        this.filter.tagsList = tagsList
                    }else{
                        console.error('Cannot request for tag list.')
                    }
                })
            },

            //与表格构建有关的辅助函数
            animationDetailURL(id: number): string {
                return `#/animations/detail/${id}/`
            },
            tagDetailURL(tag: string): string {
                return `#/tags/detail/${encodeURIComponent(tag)}/`
            },
            staffDetailURL(id: number): string {
                return `#/staffs/detail/${id}/`
            },
            playStatus(publishedQuantity: number, sumQuantity: number): string {
                if(sumQuantity == null) {
                    return null
                }else if(publishedQuantity == null) {
                    return `预计共${sumQuantity}话`
                }else if(publishedQuantity < sumQuantity) {
                    return `${publishedQuantity}/${sumQuantity}话`
                }else{
                    return `全${sumQuantity}话`
                }
            },
            titleCol(title1: string, title2: string): string {
                if(title1 && title2) {
                    return `${title1} / ${title2}`
                }else if(title1) {
                    return title1
                }else{
                    return title2
                }
            },
            fmtPublishTime(time: string): string {
                if(time) {
                    let match = time.match(/([0-9]+)-([0-9]+)-([0-9]+)/)
                    if(match) {
                        return `${match[1]}年${match[2]}月`
                    }
                }
                return time
            },
        },
        created() {
            if(window.localStorage[`${prefix}animation-list.view.detail-on`] != null) {
                let val = window.localStorage[`${prefix}animation-list.view.detail-on`]
                this.view.detailOn = val === "true" ? true : val === "false" ? false : !!val
            }
            if(window.localStorage[`${prefix}animation-list.view.detail-mode`] != null) {
                this.view.detailMode = window.localStorage[`${prefix}animation-list.view.detail-mode`]
                this.view.detailModeTitle = this.view.detailMode === 'OVERVIEW' ? '概览' :
                                            this.view.detailMode === 'INFO' ? '介绍信息' : '原作和制作'
            }
        }
    })
    $('#animation-list #filter-tags-picker').dropdown({
        fullTextSearch: true,
        allowAdditions: true
    })
    return vm
}