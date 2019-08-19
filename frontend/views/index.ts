interface TableData {
    title: string, cover: string | null, animationId: number,
    weekday: number, diff: number, nextDate: Date
}
interface DiaryData {
    title: string, animationId: number,
    watched?: number, sum?: number
}

(function () {
    const Vue = window['Vue']
    const client = window['client']
    const webURL = window['webURL']
    const serverURL = window['serverURL']
    const NO_COVER_URL = `${window['staticURL']}/images/no_cover.jpg`

    const SEASON = ['冬', '春', '夏', '秋']
    const WEEKDAY_NAME = [undefined, 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

    let vm = new Vue({
        el: '#main',
        data: {
            profile: {
                cover: null,
                username: null,
                name: null,
                isAuthenticated: null,
                nightUpdateMode: null
            },
            diary: {
                updateList: [],     //追番更新
                attachList: [],     //补番状况
                animationList: []
            },
            table: {
                todayWeekday: new Date().getDay() || 7,
                middleWeekday: new Date().getDay() || 7,    //放置在中间的周数的值
                table: [],                                  //周数的列表值。是一个二维列表
            }
        },
        computed: {
            season() {
                let date = new Date()
                let year = date.getFullYear()
                let season = Math.floor(date.getMonth() / 3)
                return `${year}年·${SEASON[season]}季`
            },
            seasonDateRange() {
                let date = new Date()
                let season = Math.floor(date.getMonth() / 3)
                return {begin: `${date.getFullYear()}-${season * 2 + 1}-01`, end: `${date.getFullYear()}-${season * 2 + 3}-30`}
            },
            weekdayName() {
                return WEEKDAY_NAME
            },
        },
        methods: {
            requestForDiary() {
                //请求diary的数据。登录时，这会同时生成diary和table项的数据。
                const firstDayOfWeekNow = (function () {
                    let now = new Date(), weekday = now.getDay() || 7
                    now.setDate(now.getDate() - weekday + 1)
                    now.setHours(0, 0, 0, 0)
                    return now
                })()
                client.personal.diaries.list({status: 'WATCHING'}, (ok, s, d) => {
                    if(ok) {
                        let data: TableData[] = []
                        for(let item of d) {
                            if(item.publish_plan.length) {
                                let next = new Date(item.publish_plan[0])
                                if(this.profile.nightUpdateMode) {
                                    next.setHours(next.getHours() - 2)
                                }
                                let diff = Math.floor((next.getTime() - firstDayOfWeekNow.getTime()) / (1000 * 60 * 60 * 24))
                                if(diff < 14) {
                                    data.splice(data.length, 0, {
                                        title: item.title,
                                        cover: client.getCoverFile(item.cover) || NO_COVER_URL,
                                        animationId: item.animation,
                                        weekday: next.getDay() || 7,
                                        nextDate: next,
                                        diff
                                    })
                                }
                            }
                        }
                        this.generateAnimationTable(data)
                        this.generateDiaryList(d)
                    }
                })
            },
            requestForAnimationTable() {
                //未登录时，会请求animation list，来生成table。
                if(!this.profile.isAuthenticated) {
                    const firstDayOfWeekNow = (function () {
                        let now = new Date(), weekday = now.getDay() || 7
                        now.setDate(now.getDate() - weekday + 1)
                        now.setHours(0, 0, 0, 0)
                        return now
                    })()
                    let {begin, end} = this.seasonDateRange
                    client.database.animations.list({publish_time__ge: begin, publish_time__le: end}, (ok, s, d) => {
                        if(ok) {
                            let data: TableData[] = []
                            for(let item of d) {
                                if(item.publish_plan.length) {
                                    let next = new Date(item.publish_plan[0])
                                    let diff = Math.floor((next.getTime() - firstDayOfWeekNow.getTime()) / (1000 * 60 * 60 * 24))
                                    if(diff < 14) {
                                        data.splice(data.length, 0, {
                                            title: item.title,
                                            cover: client.getCoverFile(item.cover) || NO_COVER_URL,
                                            animationId: item.animation,
                                            weekday: next.getDay() || 7,
                                            nextDate: next,
                                            diff
                                        })
                                    }
                                }
                            }
                            this.generateAnimationTable(data)
                            this.generateDiaryList(d)
                        }
                    })
                }
            },
            generateAnimationTable(data: TableData[]) {
                //用取得的数据生成周历。
                let table = [undefined, [], [], [], [], [], [], []]
                for(let item of data) {
                    table[item.weekday].splice(table[item.weekday].length, 0, item)
                }
                for(let i = 1; i <= 7; ++i) {
                    let dayList: TableData[] = table[i]
                    dayList.sort((a, b) => {
                        let tA = a.nextDate.getHours() * 60 + a.nextDate.getMinutes() * 24,
                            tB = b.nextDate.getHours() * 60 + b.nextDate.getMinutes() * 24
                        return tA === tB ? 0 : tA < tB ? -1 : 1
                    })
                }
                this.table.table = table
            },
            generateDiaryList(data: any[]) {
                if(this.profile.isAuthenticated) {
                    let updateList: DiaryData[] = [], attachList: DiaryData[] = []
                    for(let item of data) {
                        if(item.published_quantity != null && item.sum_quantity != null && item.published_quantity >= item.sum_quantity) {
                            attachList[attachList.length] = {
                                title: item.title,
                                animationId: item.animation,
                                watched: item.watched_quantity,
                                sum: item.sum_quantity
                            }
                        }else if(item.watched_quantity < item.published_quantity) {
                            updateList[updateList.length] = {
                                title: item.title,
                                animationId: item.animation,
                                watched: item.watched_quantity
                            }
                        }
                    }
                    this.diary.updateList = updateList
                    this.diary.attachList = attachList
                }else{
                    let animationList: DiaryData[] = []
                    for(let item of data) {
                        animationList[animationList.length] = {
                            title: item.title,
                            animationId: item.id
                        }
                    }
                    this.diary.animationList = animationList
                }
            },

            //UI逻辑
            navigateWeekdayTable(direct: 'next' | 'prev') {
                if(direct === 'next') {
                    this.table.middleWeekday = this.table.middleWeekday === 7 ? 1 : this.table.middleWeekday + 1
                }else{
                    this.table.middleWeekday = this.table.middleWeekday === 1 ? 7 : this.table.middleWeekday - 1
                }
            },
            //辅助函数
            tableDetailURL(id: number) {
                return this.profile.isAuthenticated ? `${webURL}/personal/diaries/#/detail/${id}/` : `${webURL}/database/#/animations/detail/${id}/`
            },
            diaryDetailURL(id: number) {
                return `${webURL}/personal/diaries/#/detail/${id}/`
            },
            animationDetailURL(id: number)  {
                return `${webURL}/database/#/animations/detail/${id}/`
            },
            getWeekdayTableNumber(middle: number) {
                let ret = []
                for(let i = -2; i < 3; ++i) {
                    let index = middle + i
                    ret[ret.length] = index > 7 ? index - 7 : index < 1 ? index + 7 : index
                }
                return ret
            },
            fmtStdTime(date: Date) {
                let hour = (this.profile.nightUpdateMode ? 2 : 0) + date.getHours()
                return `${hour >= 10 ? "" : "0"}${hour}:${date.getMinutes() > 10 ? "" : "0"}${date.getMinutes()}`
            },
        },
        created() {
            window['vms']['top-bar'].delegateOnProfile((profile) => {
                this.profile.cover = profile.cover
                this.profile.username = profile.username
                this.profile.name = profile.name
                this.profile.isAuthenticated = profile.is_authenticated
                this.profile.nightUpdateMode = profile.night_update_mode
                if(this.profile.isAuthenticated) this.requestForDiary()
                this.requestForAnimationTable()
            })
        }
    })

    window['vms']['main'] = vm
})()