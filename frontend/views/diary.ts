interface ServerDiary {
    id: number,
    title: string,
    cover: string | null,
    animation: number,
    watched_quantity: number,
    sum_quantity: number,
    published_quantity: number,
    publish_plan: string[],
    subscription_time: string | null,
    finish_time: string | null,
    status: "READY" | "WATCHING" | "COMPLETE" | "GIVEUP",
    watch_many_times: boolean,
    watch_original_work: boolean,
    create_time: string,
    update_time: string
}
interface Diary {
    title: string,
    cover: string,
    animation: number,
    watchedQuantity: number,
    sumQuantity: number,
    publishedQuantity: number,
    publishPlan: Date[],
    subscriptionTime: Date | null,
    finishTime: Date | null,
    status: "READY" | "WATCHING" | "COMPLETE" | "GIVEUP",
    watchManyTimes: boolean,
    watchOriginalWork: boolean,
    createTime: Date,
    updateTime: Date,
    //一些附加的字段
    nextPublish: null | {       //存在下一个更新计划
        next: Date,
        weekday: number,        //周数。1 ～ 7
        firstDayOfWeek: Date,   //该周的第一天的日期
        diff: number,           //更新日期和该周第一天日期的日期差。[0, 14)是周内时间，超出是计划外时间
    }
}
(function () {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const webURL = window['webURL']
    const serverURL = window['serverURL']
    const setTitle = window['setTitle']
    const NO_COVER_URL = `${window['staticURL']}/images/no_cover.jpg`

    const PAGE_LIMIT_IN_TABLE = 20
    const WEEKDAY_NAME = [undefined, '周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const SORT_CHOICE = [
        {value: 'week',     title: '周历'},           //按照下次更新的weekday。参与weekday排序的只排本周和下周，更晚时间的排在后面，按时间排序，没有更新的排在最后
        {value: 'name',     title: '名称'},           //按title字典序
        {value: 'publish',  title: '即将更新'},        //按照下次更新的datetime，没有更新的排在最后
        {value: 'create',   title: '创建顺序'},        //按照createTime
    ]
    const FILTER_CHOICE = [
        {value: 'doing',    title: '活跃订阅'},       //状态为watching，且没有看完全部存货，或还有放送计划。
        {value: 'updating', title: '在更新'},       //状态为watching，publish plan不为空
        {value: 'stock',    title: '有存货'},         //状态为watching，published - watch > 0，还有没有看的
        {value: 'all',    title: '全部订阅'},       //状态为watching或complete
        {value: 'ready',    title: '未上线'},         //状态为ready
        {value: 'giveup',   title: '已放弃'},         //状态为giveup
    ]
    const STATUS_NAME_ENUM = {
        READY: '未上线',
        WATCHING: '订阅中',
        COMPLETE: '已看完',
        GIVEUP: '已放弃'
    }

    const FILTER_FUNCTION = {
        doing(item: ServerDiary): boolean {
            return (item.status === 'WATCHING' || item.status === 'COMPLETE') && (item.watched_quantity < item.published_quantity || item.publish_plan.length > 0)
        },
        all(item: ServerDiary): boolean {return item.status === 'WATCHING' || item.status === 'COMPLETE'},
        updating(item: ServerDiary): boolean {return item.status === 'WATCHING' && item.publish_plan.length > 0},
        stock(item: ServerDiary): boolean {return item.status === 'WATCHING' && item.published_quantity > item.watched_quantity},
        ready(item: ServerDiary): boolean {return item.status === 'READY'},
        giveup(item: ServerDiary): boolean {return item.status === 'GIVEUP'},
    }
    const SORT_FUNCTION = {
        week(a: Diary, b: Diary): number {
            if(a.nextPublish && b.nextPublish) {
                let inTableA = a.nextPublish.diff < 14,
                    inTableB = b.nextPublish.diff < 14
                let secA = a.nextPublish.next.getHours() * 60 + a.nextPublish.next.getMinutes(),
                    secB = b.nextPublish.next.getHours() * 60 + b.nextPublish.next.getMinutes()
                if(inTableA && inTableB) return a.nextPublish.weekday === b.nextPublish.weekday ? (
                    secA === secB ? 0 : secA < secB ? -1 : 1
                ) : a.nextPublish.weekday < b.nextPublish.weekday ? -1 : 1
                else return !inTableA && !inTableB ? (
                    a.nextPublish.next.getTime() === a.nextPublish.next.getTime() ? 0 :
                    a.nextPublish.next.getTime() < a.nextPublish.next.getTime() ? -1 : 1
                ) : inTableA ? -1 : 1
            }else return a.nextPublish == null && b.nextPublish == null ? 0 : a.nextPublish == null ? 1 : -1
        },
        name(a: Diary, b: Diary): number {
            return a.title.localeCompare(b.title, 'zh')
        },
        publish(a: Diary, b: Diary): number {
            let nextA = a.publishPlan.length ? a.publishPlan[0].getTime() : null, nextB = b.publishPlan.length ? b.publishPlan[0].getTime() : null
            if(nextA == null && nextB == null) return 0
            else if(nextA != null && nextB != null) return nextA === nextB ? 0 : nextA < nextB ? -1 : 1
            else return nextA == null ? 1 : -1
        },
        create(a: Diary, b: Diary): number {
            let tA = a.createTime.getTime(), tB = b.createTime.getTime()
            return tA === tB ? 0 : tA < tB ? -1 : 1
        }
    }

    function mapArray<T, R>(a: T[], func: (T) => R): R[] {
        let ret = []
        for(let i of a) {
            let result = func(i)
            if(result !== undefined) ret[ret.length] = result
        }
        return ret
    }
    function transDiaryToLocal(origin: ServerDiary): Diary {
        const firstDayOfWeekNow = (function () {
            let now = new Date(), weekday = now.getDay() || 7
            now.setDate(now.getDate() - weekday + 1)
            now.setHours(0, 0, 0, 0)
            return now
        })()
        return {
            title: origin.title,
            cover: origin.cover ? `${serverURL}/static/cover/${origin.cover}` : NO_COVER_URL,
            animation: origin.animation,
            watchedQuantity: origin.watched_quantity,
            sumQuantity: origin.sum_quantity || 0,
            publishedQuantity: origin.published_quantity || 0,
            publishPlan: mapArray(origin.publish_plan, (r) => new Date(r)),
            subscriptionTime: origin.subscription_time ? new Date(origin.subscription_time) : null,
            finishTime: origin.finish_time ? new Date(origin.finish_time) : null,
            status: origin.status,
            watchManyTimes: origin.watch_many_times,
            watchOriginalWork: origin.watch_original_work,
            createTime: new Date(origin.create_time),
            updateTime: new Date(origin.update_time),
            nextPublish: origin.publish_plan.length ? (function (next) {
                if(vm.ui.nightMode) {
                    next.setHours(next.getHours() - 2)
                }
                let weekday = next.getDay() || 7
                let firstDayOfWeek = (function (d: Date, w: number) {
                        let ret = new Date()
                        ret.setFullYear(d.getFullYear(), d.getMonth(), d.getDate())
                        ret.setDate(ret.getDate() - w + 1)
                        ret.setHours(0, 0, 0, 0)
                        return ret
                    })(next, weekday)
                let diff = Math.floor((next.getTime() - firstDayOfWeekNow.getTime()) / (1000 * 60 * 60 * 24))
                return {next, weekday, firstDayOfWeek, diff}
            }(new Date(origin.publish_plan[0]))) : null
        }
    }

    function getHash(): {mode: 'diary' | 'history' | 'detail', id?: number} {
        const DIARY_REGEX = /#?\/?diary\/?/
        const HISTORY_REGEX = /#?\/?history\/?/
        const DETAIL_REGEX = /#?\/?detail\/([0-9]+)\/?/
        let hash = window.location.hash
        if(!hash) {
            return {mode: 'diary'}
        }
        let found = hash.match(DETAIL_REGEX)
        if(found) {
            return {
                mode: 'detail',
                id: parseInt(decodeURIComponent(found[1]))
            }
        }
        found = hash.match(HISTORY_REGEX)
        if(found) {
            return {mode: 'history'}
        }
        found = hash.match(DIARY_REGEX)
        if(found) {
            return {mode: 'diary'}
        }
        return {mode: 'diary'}
    }

    let backend = null

    let vm = new Vue({
        el: '#main',
        data: {
            mode: null,         //diary|history|detail
            id: null,           //detail模式下正在查看的animation id
            sort: {
                title: SORT_CHOICE[0].title,
                by: 0,
                desc: false
            },
            filter: {
                title: FILTER_CHOICE[0].title,
                value: FILTER_CHOICE[0].value,
                by: 0,
                search: ''
            },
            pagination: {
                pageIndex: 1,   //当前页码
                pageLimit: PAGE_LIMIT_IN_TABLE,     //每页的最大条目数量
                count: 0,          //当前项目在数据库中的总数量
                maxPageIndex: 1,   //计算得到的最大页码数
                navigator: []      //生成的页码方案，方便绑定直接跳转页码
            },
            ui: {
                loading: false,
                errorInfo: false,

                parentAt: null,
                nightMode: null,    //夜间看番模式。26:00模式
            },
            items: [],
            detail: {
                title: '',
                cover: null,
                animation: null,

                watchedQuantity: 0,
                subscriptionTime: null,
                finishTime: null,
                status: "READY",

                watchManyTimes: false,
                watchOriginalWork: false,

                sumQuantity: null,
                publishedQuantity: null,
                publishPlan: [],

                createTime: null,
                updateTime: null
            },
            editor: {
                edited: false,       //标记是否进行过修改
                editWatched: false
            }
        },
        computed: {
            sortChoices() {
                return SORT_CHOICE
            },
            filterChoices() {
                return FILTER_CHOICE
            },
            statusNameEnums() {
                return STATUS_NAME_ENUM
            },
            statusColorEnums() {
                return {
                    READY: 'red',
                    WATCHING: 'brown',
                    COMPLETE: 'violet',
                    GIVEUP: 'grey'
                }
            },
            parentURL() {
                return `#/${this.ui.parentAt || 'diary'}/`
            },
        },
        watch: {
            'editor.edited': function (val) {
                if(!val) {
                    this.editor.editWatched = false
                }
            }
        },
        methods: {
            //导航逻辑
            hashChanged() {
                let {mode, id} = getHash()
                if(mode != this.mode || id != this.id) {
                    this.items = []
                    this.mode = mode
                    this.id = id
                    if(mode === 'diary') {
                        setTitle('日记')
                        this.ui.parentAt = 'diary'
                        if(backend == null) {
                            this.query((ok) => {try{if(ok) this.refreshDiaryList()}catch (e) {console.error(e)}})
                        }else{
                            this.refreshDiaryList()
                        }
                    }else if(mode === 'history') {
                        setTitle('足迹')
                        this.ui.parentAt = 'history'
                        this.requestForHistory()
                    }else if(mode === 'detail') {
                        setTitle('详情')
                        this.requestForDetail()
                    }
                }
            },
            //【日记列表】数据逻辑
            query(callback?: (ok: boolean) => void) {
                /** 向服务器请求日记列表所需要的数据。这些请求不携带筛选或排序信息，这些工作在前端完成。 */
                this.ui.loading = true
                client.personal.diaries.list({status__in: 'READY WATCHING GIVEUP'}, (ok, s, d) => {
                    if(ok) {
                        backend = d
                    }else{
                        this.ui.errorInfo = s === 401 ? '请先登录。' :
                                            s === 403 ? '没有访问权限。' :
                                            s === 404 ? '找不到访问的资源。' :
                                            s === 500 ? '内部服务器发生预料之外的错误。' : '网络连接发生错误。'
                    }
                    if(typeof callback === 'function') callback(ok)
                    this.ui.loading = false
                })
            },
            refreshDiaryList() {
                /** 将query请求到的backend数据刷新到显示列表中。这个过程会处理筛选或排序等工作。 */
                this.requestForSetting()
                let ret: Diary[] = []
                let filterFunction = FILTER_FUNCTION[this.filter.value]
                let searchText = this.filter.search.trim() ? this.filter.search.trim().split(' ') : null
                function searchFor(data: ServerDiary): boolean {
                    if(searchText) {
                        for(let i of searchText) {
                            if(data.title.indexOf(i) >= 0) {
                                return true
                            }
                        }
                        return false
                    }else{
                        return true
                    }
                }
                for(let d of backend) if(filterFunction(d) && searchFor(d)) ret[ret.length] = transDiaryToLocal(d)
                let sortFunction = SORT_FUNCTION[SORT_CHOICE[this.sort.by].value]

                ret.sort(this.sort.desc ? ((a, b) => sortFunction(b, a)) : sortFunction)
                this.items = mapArray(ret, (d) =>{return {data: d, mouseover: false, loading: false}})
            },
            pushNextWatch(item: {data: Diary, loading: boolean}) {
                if(item.data.watchedQuantity < item.data.publishedQuantity) {
                    item.loading = true
                    client.personal.diaries.partialUpdate(item.data.animation, {watched_quantity: item.data.watchedQuantity + 1}, (ok, s, d) => {
                        if(ok) {
                            item.data.watchedQuantity += 1
                            if(backend != null) {
                                for(let i = 0; i < backend.length; ++i) {
                                    if(backend[i].animation === d.animation) {
                                        backend[i] = d
                                        break
                                    }
                                }
                            }
                        }else if(s != null) {
                            alert(`发生预料之外的错误。错误代码：${s}`)
                        }else{
                            alert('网络连接发生错误。')
                        }
                        item.loading = false
                    })
                }
            },
            requestForSetting() {
                if(this.ui.nightMode == null) {
                    if(window['vms']['top-bar'].profile.is_authenticated != null) {
                        this.ui.nightMode = window['vms']['top-bar'].profile.night_update_mode
                    }else{
                        client.profile.info.get((ok, s, d) => {
                            if(ok) {
                                this.ui.nightMode = d.night_update_mode
                            }
                        })
                    }
                }
            },
            //【历史】数据逻辑
            requestForHistory() {
                this.ui.loading = true
                client.personal.diaries.list({
                    search: this.filter.search.trim(),
                    status: 'COMPLETE',
                    ordering: '-finish_time',
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
                        this.items = this.formatForHistory(data)
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
            formatForHistory(data: ServerDiary[]): Diary[] {
                let ret = []
                for(let item of data) ret[ret.length] = transDiaryToLocal(item)
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
            //【详情页】数据逻辑
            requestForDetail(data?: ServerDiary) {
                if(data != undefined) {
                    doSomething(data)
                }else if(backend != null) {
                    for(let item of backend) {
                        if(item.animation === this.id) {
                            doSomething(item)
                            return
                        }
                    }
                }
                this.ui.loading = true
                client.personal.diaries.retrieve(this.id, (ok, s, d) => {
                    if(ok) {
                        doSomething(d)
                    }else{
                        this.ui.errorInfo = s === 401 || s === 403 ? '请先登录。' :
                                            s === 404 ? '找不到资源。' :
                                            s === 500 ? '内部服务器发生预料之外的错误。' : '网络连接发生错误。'
                    }
                    this.ui.loading = false
                })

                function doSomething(data: ServerDiary) {
                    vm.requestForSetting()
                    vm.detail = transDiaryToLocal(data)
                    setTitle(`${vm.detail.title} - 日记`)
                    vm.editor.edited = false
                }
            },
            saveEditor() {
                if(this.editor.edited) {
                    client.personal.diaries.partialUpdate(this.id, {
                        watch_many_times: this.detail.watchManyTimes,
                        watch_original_work: this.detail.watchOriginalWork,
                        status: this.detail.status,
                        watched_quantity: this.detail.watchedQuantity || 0
                    }, (ok, s, d) => {
                        if(ok) {
                            this.requestForDetail(d)
                            this.editor.edited = false
                            if(backend != null) {
                                for(let i = 0; i < backend.length; ++i) {
                                    if(backend[i].animation === d.animation) {
                                        backend[i] = d
                                        break
                                    }
                                }
                            }
                        }else if(s != null) {
                            alert(`发生预料之外的错误。错误代码：${s}`)
                        }else{
                            alert('网络连接发生错误。')
                        }
                    })
                }
            },
            //【日记列表】UI逻辑
            sortBy(index: number) {
                if(index === this.sort.by) {
                    this.sort.desc = !this.sort.desc
                }else{
                    this.sort.by = index
                    this.sort.title = SORT_CHOICE[index].title
                }
                this.refreshDiaryList()
            },
            filterBy(index: number) {
                if(index !== this.filter.by) {
                    this.filter.by = index
                    this.filter.title = FILTER_CHOICE[index].title
                    this.filter.value = FILTER_CHOICE[index].value
                    this.refreshDiaryList()
                }
            },
            searchFor() {
                if(this.mode === 'diary') {
                    this.refreshDiaryList()
                }else{
                    this.requestForHistory()
                }
            },
            //【历史】UI逻辑
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
                    this.requestForHistory()
                }
            },
            //【详情页】UI逻辑
            changeStatus() {
                if(this.detail.status === 'GIVEUP') this.detail.status = 'WATCHING'
                else this.detail.status = 'GIVEUP'
                this.editor.edited = true
            },

            //辅助函数
            animationDetailURL(animationId: number): string {
                return `${webURL}/database/#/animations/detail/${animationId}/`
            },
            commentDetailURL(animationId: number): string {
                return `${webURL}/personal/comments/#/detail/${animationId}/`
            },
            diaryDetailURL(animationId: number): string {
                return `#/detail/${animationId}/`
            },
            updateNotice(item: Diary): string {
                if(item.nextPublish) {
                    let date = item.nextPublish.next
                    let prefix = item.nextPublish.diff < 14 ?
                        `${item.nextPublish.diff < 7 ? '本' : '下'}${WEEKDAY_NAME[item.nextPublish.weekday]}` :
                        `${date.getFullYear() !== new Date().getFullYear() ? date.getFullYear() + '年' : ''}${date.getMonth() + 1}月${date.getDate()}日`
                    let hour = (vm.ui.nightMode ? 2 : 0) + date.getHours()
                    return `${prefix}${hour < 10 ? '0' : ''}${hour}:${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}更新`
                }else return null
            },
            watchedNotice(item: Diary): string {
                if(item.watchedQuantity === 0) return '还没开始看'
                else if(item.watchedQuantity >= item.sumQuantity) return '已全部看完'
                else return `已看完 ${item.watchedQuantity} 话`
            },
            fmtStdDate(date: Date): string {
                if(date) {
                    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours() < 10 ? '0' : ''}${date.getHours()}:${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}`
                }else{
                    return null
                }
            },
            fmtShortDate(date: Date): string {
                if(date) {
                    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
                }else{
                    return null
                }
            },
            rangeOfList(arr: any[], from: number, to?: number): any[] {
                let ret = []
                if(to == undefined) to = arr.length
                for(let i = from; i < to; ++i) ret[ret.length] = arr[i]
                return ret
            }
        },
        created() {
            this.hashChanged()
        }
    })

    $('#main .ui.dropdown.dropdown-menu').dropdown({action: 'hide'})
    $('#main .ui.dropdown.dropdown-select').dropdown({fullTextSearch: true})

    window.onhashchange = vm.hashChanged
    window['vms']['main'] = vm
})()