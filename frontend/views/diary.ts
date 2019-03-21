interface ServerDiary {
    id: number,
    title: string,
    cover: string | null,
    animation: number,
    watched_record: string[],
    watched_quantity: number,
    sum_quantity: number,
    published_quantity: number,
    publish_plan: string[],
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
    watchedRecord: Date[],
    watchedQuantity: number,
    sumQuantity: number,
    publishedQuantity: number,
    publishPlan: Date[],
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
    const serverURL = window['serverURL']
    const NO_COVER_URL = `${window['staticURL']}/images/no_cover.jpg`

    const WEEKDAY_NAME = [undefined, '周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const SORT_CHOICE = [
        {value: 'week',     title: '周历'},           //按照下次更新的weekday。参与weekday排序的只排本周和下周，更晚时间的排在后面，按时间排序，没有更新的排在最后
        {value: 'name',     title: '名称'},           //按title字典序
        {value: 'publish',  title: '即将更新'},        //按照下次更新的datetime，没有更新的排在最后
        {value: 'create',   title: '创建顺序'},        //按照createTime
    ]
    const FILTER_CHOICE = [
        {value: 'doing',    title: '全部订阅'},       //状态为watching，
        {value: 'updating', title: '在更新中'},       //状态为watching，publish plan不为空
        {value: 'stock',    title: '有存货'},         //状态为watching，published - watch > 0，还有没有看的
        {value: 'ready',    title: '未上线'},         //状态为ready
        {value: 'giveup',   title: '已放弃'},         //状态为giveup
    ]

    const FILTER_FUNCTION = {
        doing(item: ServerDiary): boolean {return item.status === 'WATCHING'},
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

    function cloneArray<T>(a: T[]): T[] {
        let ret = []
        for(let i of a) {
            ret[ret.length] = i
        }
        return ret
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
            watchedRecord: mapArray(origin.watched_record, (r) => new Date(r)),
            watchedQuantity: origin.watched_quantity,
            sumQuantity: origin.sum_quantity || 0,
            publishedQuantity: origin.published_quantity || 0,
            publishPlan: mapArray(origin.publish_plan, (r) => new Date(r)),
            finishTime: origin.finish_time ? new Date(origin.finish_time) : null,
            status: origin.status,
            watchManyTimes: origin.watch_many_times,
            watchOriginalWork: origin.watch_original_work,
            createTime: new Date(origin.create_time),
            updateTime: new Date(origin.update_time),
            nextPublish: origin.publish_plan.length ? (function (next) {
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

    let backend = null

    let vm = new Vue({
        el: '#main',
        data: {
            mode: 'diary',      //diary|history|detail
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
            ui: {
                loading: false,
                errorInfo: false
            },
            items: []
        },
        computed: {
            sortChoices() {
                return SORT_CHOICE
            },
            filterChoices() {
                return FILTER_CHOICE
            }
        },
        methods: {
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
                            for(let i of backend) {
                                if(i.animation === item.data.animation) {
                                    i.watched_quantity += 1
                                    break
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
            //辅助函数
            diaryDetailURL(animationId: number): string {
                return `#/detail/${animationId}/`
            },
            updateNotice(item: Diary): string {
                if(item.nextPublish) {
                    let date = item.nextPublish.next
                    let prefix = item.nextPublish.diff < 14 ?
                        `${item.nextPublish.diff < 7 ? '本' : '下'}${WEEKDAY_NAME[item.nextPublish.weekday]}` :
                        `${date.getFullYear() !== new Date().getFullYear() ? date.getFullYear() + '年' : ''}${date.getMonth() + 1}月${date.getDate()}日`
                    return `${prefix}${date.getHours() < 10 ? '0' : ''}${date.getHours()}:${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}更新`
                }else return null
            },
            watchedNotice(item: Diary): string {
                if(item.watchedQuantity === 0) return '还没开始看'
                else if(item.watchedQuantity >= item.sumQuantity) return '已全部看完'
                else return `已看完${item.watchedQuantity}话`
            }
        },
        created() {
            this.query((ok) => {
                try{
                    if(ok) this.refreshDiaryList()
                }catch (e) {
                    console.error(e)
                }
            })
        }
    })

    $('#main .ui.dropdown.dropdown-menu').dropdown({action: 'hide'})
    $('#main .ui.dropdown.dropdown-select').dropdown({fullTextSearch: true})

    window['vms']['main'] = vm
})()