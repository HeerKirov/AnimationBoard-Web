function createAnimationNewVue(selectName: string, location: {mode: string, tab: string, id: number | string, page: number}) {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const webURL = window['webURL']

    const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
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

    function formatDateMinuteToStr(datetime: Date): string {
        if (!datetime) return null
        let year   = datetime.getFullYear()
        let month  = datetime.getMonth() + 1
        let day    = datetime.getDate()
        let hour   = datetime.getHours()
        let minute = datetime.getMinutes()

        function fmt(n) {
            return n < 10 ? `0${n}` : n
        }

        return `${year}-${fmt(month)}-${fmt(day)} ${fmt(hour)}:${fmt(minute)}`
    }

    function concatArray<T>(a: T[], b: T[]): T[] {
        let ret = []
        for(let i of a) ret[ret.length] = i
        for(let i of b) ret[ret.length] = i
        return ret
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
            ret[ret.length] = func(i)
        }
        return ret
    }

    let vm = new Vue({
        el: selectName,
        data: {
            data: {
                title: '',
                originTitle: null,
                otherTitle: null,

                originalWorkType: ' ',
                originalWorkAuthors: [],
                staffCompanies: [],
                staffSupervisors: [],

                publishType: 'GENERAL',
                publishTime: null,
                duration: 24,
                sumQuantity: 12,
                publishedQuantity: 0,
                publishPlan: [],
                subtitleList: [],

                tags: [],
                limitLevel: ' ',
                keyword: null,
                introduction: null,
                links: []
            },
            ui: {
                forbidden: false,
                loading: false,
                tagEditor: {
                    show: false,
                    tagList: [],    //全部的备选标签的列表
                    showResult: [], //在前端展示的搜索结果
                    search: '',     //标签搜索
                    searchFlag: false,  //标记是否存在搜索元素
                },
                staffListByOrg: [],
                staffListByPerson: [],
                publishPlan: {
                    panel: null,
                    newGeneralTime: null,
                    newWeekTime: null,
                    newWeekInterval: 7,
                    newWeekItemCount: null,
                },
                error: {
                    title: null,
                    originTitle: null,
                    otherTitle: null,

                    duration: null,
                    sumQuantity: null,
                    publishedQuantity: null,
                    publishPlan: null,
                    subtitleList: null
                }
            }
        },
        computed: {
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
            'ui.publishPlan.panel': function (val) {
                if(val === 'WEEK' && !this.ui.publishPlan.newWeekItemCount) {
                    let plan = this.data.publishPlan.length
                    if(this.data.sumQuantity != "" && this.data.publishedQuantity != "") {
                        let sum = parseInt(this.data.sumQuantity)
                        let published = parseInt(this.data.publishedQuantity)
                        if(sum - published - plan > 0) {
                            this.ui.publishPlan.newWeekItemCount = sum - published - plan
                        }
                    }else if(this.data.sumQuantity != "") {
                        let sum = parseInt(this.data.sumQuantity)
                        if(sum > plan) {
                            this.ui.publishPlan.newWeekItemCount = sum - plan
                        }
                    }
                }
            },
            'ui.tagEditor.search': function () {
                this.searchTag()
            }
        },
        methods: {
            load() {
                this.ui.loading = true
                client.profile.info.get((ok, s, d) => {
                    if(ok && d && d['is_staff']) {
                        this.ui.loading = false
                        this.updateTagList()
                        this.updateStaffList()
                    }else{
                        this.ui.forbidden = true
                    }
                })
            },
            refresh() {},
            leave() {},
            //数据逻辑
            updateTagList() {
                client.database.tags.list({ordering: 'id'}, (ok, s, d) => {
                    if(ok) {
                        let tagList = []
                        for(let tag of d) {
                            tagList[tagList.length] = {
                                id: tag.id,
                                name: tag.name
                            }
                        }
                        this.ui.tagEditor.tagList = tagList
                        this.searchTag()
                    }else{
                        console.error('Cannot request for tag list.')
                    }
                })
            },
            updateStaffList() {
                client.database.staffs.list({ordering: '-id'}, (ok, s, d) => {
                    if(ok) {
                        let orgList = [], personList = []
                        for(let staff of d) {
                            if(staff.is_organization) {
                                orgList[orgList.length] = {id: staff.id, name: staff.name}
                            }else{
                                personList[personList.length] = {id: staff.id, name: staff.name}
                            }
                        }
                        this.ui.staffListByOrg = concatArray(orgList, personList)
                        this.ui.staffListByPerson = concatArray(personList, orgList)
                    }else{
                        console.error('Cannot request for staff list.')
                    }
                })
            },
            validate(): boolean {
                for(let key in this.ui.error) this.ui.error[key] = null
                let ok = true
                let data = this.data

                function throwErr(key: string, content: string) {
                    ok = false
                    vm.ui.error[key] = content
                }

                if(data.title == null || !data.title.trim()) throwErr('title', '标题不能为空。')
                else if(data.title && data.title.length > 64) throwErr('title', '标题的长度不能超过64。')
                if(data.originTitle && data.originTitle.length > 64 ) throwErr('originTitle', '原标题的长度不能超过64。')
                if(data.otherTitle && data.otherTitle.length > 64 ) throwErr('otherTitle', '其他标题的长度不能超过64。')
                if(data.duration) {
                    let value = parseInt(data.duration)
                    if(isNaN(value)) throwErr('duration', '值必须是合法整数。')
                    else if(value < 0) throwErr('duration', '值不能小于0。')
                }
                let sumQuantity = null
                if(data.sumQuantity) {
                    let value = parseInt(data.sumQuantity)
                    if(isNaN(value)) throwErr('sumQuantity', '值必须是合法整数。')
                    else if(value < 0) throwErr('sumQuantity', '值不能小于0。')
                    if(ok) sumQuantity = value
                }
                let publishedQuantity = null
                if(data.publishedQuantity) {
                    let value = parseInt(data.publishedQuantity)
                    if(isNaN(value)) throwErr('publishedQuantity', '值必须是合法整数。')
                    else if(value < 0) throwErr('publishedQuantity', '值不能小于0。')
                    else if(sumQuantity != null && value > sumQuantity) throwErr('publishedQuantity', '已发布话数的值不能超过总话数。')
                    if(ok) publishedQuantity = value
                }
                if(data.publishPlan && sumQuantity != null && data.publishPlan.length + (publishedQuantity != null ? publishedQuantity : 0) > sumQuantity) {
                    throwErr('publishPlan', '放送计划的条目数加上已发布话数已经超过了总话数。')
                }
                if(data.subtitleList && sumQuantity != null && data.subtitleList.length > sumQuantity) {
                    throwErr('subtitleList', '子标题的条目数超过了总话数。')
                }

                return ok
            },
            generateData() {
                let data = this.data
                return {
                    title: data.title.trim(),
                    origin_title: data.originTitle ? data.originTitle.trim() : null,
                    other_title: data.otherTitle ? data.otherTitle.trim() : null,

                    original_work_type: data.originalWorkType && data.originalWorkType != ' ' ? data.originalWorkType : null,
                    original_work_authors: cloneArray(data.originalWorkAuthors),
                    staff_companies: cloneArray(data.staffCompanies),
                    staff_supervisors: cloneArray(data.staffSupervisors),

                    publish_type: data.publishType,
                    publish_time: data.publishTime || null,
                    duration: parseInt(data.duration),
                    sum_quantity: data.sumQuantity ? parseInt(data.sumQuantity) : null,
                    published_quantity: data.publishedQuantity ? parseInt(data.publishedQuantity) : null,
                    publish_plan: cloneArray(data.publishPlan),
                    subtitle_list: cloneArray(data.subtitleList),

                    tags: mapArray(data.tags, (tag) => tag.name),
                    limit_level: data.limitLevel && data.limitLevel != ' ' ? data.limitLevel : null,
                    keyword: data.keyword || null,
                    introduction: data.introduction || null,
                    links: mapArray(data.links, (link) => link.value),

                    original_relations: {}
                }
            },
            generateNewTags(): string[] {
                let ret = []
                for(let tag of this.data.tags) {
                    if(!tag.id) {
                        let flag = true
                        for(let t of this.ui.tagEditor.tagList) {
                            if(t.name === tag.name) {
                                flag = false
                                break
                            }
                        }
                        if(flag) ret[ret.length] = tag.name
                    }
                }
                return ret
            },
            clear() {
                this.data.title = ''
                this.data.originTitle = null
                this.data.otherTitle = null
                this.data.originalWorkType = ' '
                this.data.originalWorkAuthors = []
                this.data.staffCompanies = []
                this.data.staffSupervisors = []
                this.data.publishType = 'GENERAL'
                this.data.publishTime = null
                this.data.duration = 24
                this.data.publishedQuantity = 0
                this.data.publishPlan = []
                this.data.subtitleList = []
                this.data.tags = []
                this.data.limitLevel = ' '
                this.data.keyword = null
                this.data.introduction = null
                this.data.links = []
            },
            submit() {
                if(this.validate()) {
                    this.ui.loading = true
                    let data = this.generateData()
                    let newTags = this.generateNewTags()
                    if(newTags.length) {
                        let remain = newTags.length
                        for(let tag of newTags) {
                            client.database.tags.create({name: tag, introduction: null}, (ok, s, d) => {
                                if(!ok) {
                                    console.error(`Error happened while create tag "${tag}", status = ${s}`)
                                }
                                if(-- remain <= 0) {
                                    submitAnimation()
                                }
                            })
                        }
                    }else{
                        submitAnimation()
                    }

                    function submitAnimation() {
                        client.database.animations.create(data, (ok, s, d) => {
                            if(ok) {
                                vm.clear()
                                if(d && d.id) {
                                    window.location.hash = `#/animations/detail/${d.id}/`
                                }else{
                                    window.location.hash = '#/animations/'
                                }
                            }else if(s === 401 || s === 403){
                                vm.ui.forbidden = true
                            }else if(s === 400) {
                                alert('发生预料之外的格式错误。')
                            }else if(s === 500) {
                                alert('服务器发生预料之外的内部错误。')
                            }else{
                                alert('网络连接发生错误。')
                            }
                            vm.ui.loading = false
                        })
                    }

                }
            },
            //前端逻辑
            searchTag() {
                if(this.ui.tagEditor.search.trim()) {
                    let search = this.ui.tagEditor.search.trim().split(' ')
                    let result = []
                    for(let tag of this.ui.tagEditor.tagList) {
                        for(let s of search) {
                            if(tag.name.indexOf(s) >= 0) {
                                result[result.length] = tag
                                break
                            }
                        }
                    }
                    this.ui.tagEditor.showResult = result
                    this.ui.tagEditor.searchFlag = true
                }else{
                    this.ui.tagEditor.showResult = this.ui.tagEditor.tagList
                    this.ui.tagEditor.searchFlag = false
                }
            },
            addSearchAsNewTag() {
                if(this.ui.tagEditor.search.trim()) {
                    let search = this.ui.tagEditor.search.trim().split(' ')
                    for(let s of search) {
                        let flag = true
                        for(let t of this.data.tags) {
                            if(t && t.name === s) {
                                flag = false
                                break
                            }
                        }
                        if(flag) {
                            vm.$set(this.data.tags, this.data.tags.length, {name: s, id: null})
                        }
                    }
                }
            },
            addExistTag(tag: {id: number, name: string}) {
                for(let t of this.data.tags) {
                    if(t && t.name === tag.name) {
                        return;
                    }
                }
                vm.$set(this.data.tags, this.data.tags.length, tag)
            },
            removeTag(index: number) {
                this.data.tags.splice(index, 1)
            },
            //link管理
            addNewLink() {
                vm.$set(this.data.links, this.data.links.length, {value: ''})
            },
            removeLink(index: number) {
                this.data.links.splice(index, 1)
            },
            //Subtitle管理
            addNewSubtitle() {
                vm.$set(this.data.subtitleList, this.data.subtitleList.length, {value: ''})
            },
            removeSubtitle(index: number) {
                this.data.subtitleList.splice(index, 1)
            },
            //publishPlan管理
            addNewGeneralPublishPlan() {
                if(this.ui.publishPlan.newGeneralTime) {
                    vm.$set(this.data.publishPlan, this.data.publishPlan.length, this.ui.publishPlan.newGeneralTime)
                    this.ui.publishPlan.newGeneralTime = null
                    $('#animation-new #new-general-publish-plan-picker').calendar('clear')
                }
            },
            addNewWeekPublishPlan() {
                if(this.ui.publishPlan.newWeekTime &&
                    this.ui.publishPlan.newWeekItemCount &&
                    this.ui.publishPlan.newWeekInterval) {
                    let count = parseInt(this.ui.publishPlan.newWeekItemCount)
                    let interval = parseInt(this.ui.publishPlan.newWeekInterval)
                    if(count > 0 && interval > 0) {
                        let timestamp = new Date(this.ui.publishPlan.newWeekTime).getTime()
                        for(let i = 0; i < count; ++i) {
                            let d = new Date(timestamp + 1000 * 60 * 60 * 24 * interval * i)
                            vm.$set(this.data.publishPlan, this.data.publishPlan.length, formatDateMinuteToStr(d))
                        }
                        $('#animation-new #new-week-publish-plan-picker').calendar('clear')
                        this.ui.publishPlan.newWeekTime = null
                        this.ui.publishPlan.newWeekItemCount = null

                    }
                }
            },
            removePublishPlan(index: number) {
                this.data.publishPlan.splice(index, 1)
            }
        },
        created() {

        }
    })
    $('#animation-new #publish-time-picker').calendar({
        type: 'month',
        formatter: {
            date(date, settings) {
                if (!date) return null
                let year  = date.getFullYear()
                let month = date.getMonth() + 1
                return `${year}-${month < 10 ? '0' : ''}${month}-01`
            }
        },
        onChange(date: Date, text: string, mode: string) {
            vm.data.publishTime = text || null
        }
    })
    $('#animation-new #new-general-publish-plan-picker').calendar({
        type: 'datetime',
        firstDayOfWeek: 1,
        ampm: false,
        formatter: {datetime: formatDateMinuteToStr},
        text: {months: MONTHS, monthsShort: MONTHS},
        onChange(date: Date, text: string) {
            vm.ui.publishPlan.newGeneralTime = text || null
        }
    })
    $('#animation-new #new-week-publish-plan-picker').calendar({
        type: 'datetime',
        firstDayOfWeek: 1,
        ampm: false,
        formatter: {datetime: formatDateMinuteToStr},
        text: {months: MONTHS, monthsShort: MONTHS},
        onChange(date: Date, text: string) {
            vm.ui.publishPlan.newWeekTime = text || null
        }
    })
    return vm
}