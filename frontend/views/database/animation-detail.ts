function createAnimationDetailVue(selectName: string, location: {mode: string, tab: string, id: number | string, page: number}) {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const webURL = window['webURL']
    const serverURL = window['serverURL']

    const NO_COVER_URL = `${window['staticURL']}/images/no_cover.jpg`
    const RELATION_NAME = ['前作', '续作', '番外', '正片', '外传', '正传', '同系列']
    const RELATION_SEQUENCE = ['PREV', 'NEXT', 'UNOFFICIAL', 'OFFICIAL', 'EXTERNAL', 'TRUE', 'SERIES']
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

    let backend: any = {}

    let vm = new Vue({
        el: selectName,
        data: {
            id: null,
            detail: {
                cover: null,
                title: null,
                originTitle: null,
                otherTitle: null,
                keyword: null,
                tags: [],
                introduction: null,
                subtitleList: [],
                limitLevel: null,
                links: [],

                publishType: 'GENERAL',
                duration: 24,
                publishTime: null,
                sumQuantity: null,
                publishedQuantity: null,
                publishPlan: [],

                originalWorkType: null,
                originalWorkAuthors: [],
                staffCompanies: [],
                staffSupervisors: [],

                relationList: [],

                haveDiary: false,
                haveComment: false
            },
            editor: {
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
                loading: false,
                errorInfo: null,
                durationSwitch: false,      //切换publish type | duration的标记变量

                editMode: false,            //编辑模式
            }
        },
        computed: {
            publishTypeClass() {
                return {
                    GENERAL: 'teal',
                    MOVIE: 'blue',
                    OVA: 'olive'
                }
            },
            originalWorkTypeClass() {
                return {
                    NOVEL: 'brown',
                    MANGA: 'red',
                    GAME: 'green',
                    ORI: 'blue',
                    OTHER: 'pink'
                }
            },
            limitLevelClass() {
                return {
                    ALL: 'green',
                    R12: 'blue',
                    R15: 'orange',
                    R17: 'brown',
                    R18: 'red',
                    R18G: 'violet'
                }
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
            },
            isLogin() {
                return window['vms']['top-bar'].profile.is_authenticated
            },
        },
        watch: {

        },
        methods: {
            load() {
                this.refresh()
            },
            refresh() {
                if(location.id != null && this.id != location.id) {
                    this.id = location.id
                    if(this.id != null) this.query()
                }
            },
            leave() {},
            //UI逻辑
            switchToEditMode() {
                //切换到编辑模式
                if(!this.ui.editMode) {
                    this.clearEditor()
                    this.refreshEditor()
                    this.ui.editMode = true
                }
            },
            submitEditor() {
                //提交编辑
                if(this.ui.editMode) {

                }
            },

            //数据逻辑
            query() {
                this.ui.errorInfo = null
                this.ui.loading = true
                this.clearDetail()
                client.database.animations.retrieve(this.id, (ok, s, d) => {
                    if(ok) {
                        backend = d
                        this.refreshDetail()
                    }else{
                        this.ui.errorInfo = s === 400 ? '数据获取格式发生错误。' :
                                                s === 401 ? '未登录。请首先登录以获取权限。' :
                                                s === 403 ? '您的账户不具备当前操作的权限。' :
                                                s === 404 ? '找不到此资源。' :
                                                s === 500 ? '服务器发生未知的内部错误。' :
                                                s == null ? '无法连接到服务器。' :
                                                            '发生未知的网络错误。'
                    }
                    this.ui.loading = false
                })
                client.personal.diaries.retrieve(this.id, (ok) => {
                    if(ok) {
                        this.detail.haveDiary = true
                    }
                })
                client.personal.comments.retrieve(this.id, (ok) => {
                    if(ok) {
                        this.detail.haveComment = true
                    }
                })
            },
            refreshDetail() {
                const staffInfo = (function (info) {
                    let ret = {}
                    for(let i of info) ret[i.id] = i
                    return ret
                })(backend.staff_info)
                function generateStaffs(idList: number[]): any[] {
                    let ret = []
                    for(let id of idList) {
                        if(staffInfo[id]) {
                            ret[ret.length] = staffInfo[id]
                        }
                    }
                    return ret
                }
                function generateRelations(relation): any[] {
                    let ret = []
                    if(relation) {
                        for(let i = 0; i < RELATION_SEQUENCE.length; ++i) {
                            let r = RELATION_SEQUENCE[i], rName = RELATION_NAME[i]
                            if(relation[r]) {
                                for(let obj of relation[r]) {
                                    if(typeof obj === 'object') {
                                        ret[ret.length] = {
                                            id: obj.id, title: obj.title, relation: rName,
                                            cover: obj.cover ? `${serverURL}/static/cover/${obj.cover}` : NO_COVER_URL
                                        }
                                    }else{
                                        ret[ret.length] = {id: obj, title: obj, cover: null, relation: rName}
                                    }
                                }
                            }
                        }
                    }
                    return ret
                }

                let data = this.detail
                data.cover = backend.cover ? `${serverURL}/static/cover/${backend.cover}` : null
                data.title = backend.title
                data.originTitle = backend.origin_title
                data.otherTitle = backend.other_title
                data.keyword = backend.keyword
                data.introduction = backend.introduction
                data.tags = backend.tags
                data.subtitleList = backend.subtitle_list
                data.limitLevel = backend.limit_level
                data.links = backend.links

                data.publishType = backend.publish_type
                data.duration = backend.duration
                data.publishTime = backend.publish_time
                data.sumQuantity = backend.sum_quantity
                data.publishedQuantity = backend.published_quantity
                data.publishPlan = backend.publish_plan

                data.originalWorkType = backend.original_work_type
                data.originalWorkAuthors = generateStaffs(backend.original_work_authors)
                data.staffCompanies = generateStaffs(backend.staff_companies)
                data.staffSupervisors = generateStaffs(backend.staff_supervisors)
                data.relationList = generateRelations(backend.relations)
            },
            clearDetail() {
                this.detail.cover = null
                this.detail.title = null
                this.detail.originTitle = null
                this.detail.otherTitle = null
                this.detail.keyword = null
                this.detail.tags = []
                this.detail.introduction = null
                this.detail.subtitleList = []
                this.detail.limitLevel = null
                this.detail.links = []

                this.detail.publishType = 'GENERAL'
                this.detail.duration = 24
                this.detail.publishTime = null
                this.detail.sumQuantity = null
                this.detail.publishedQuantity = null
                this.detail.publishPlan = []

                this.detail.originalWorkType = null
                this.detail.originalWorkAuthors = []
                this.detail.staffCompanies = []
                this.detail.staffSupervisors = []

                this.detail.relationList = []

                this.detail.haveDiary = false
                this.detail.haveComment = false
            },
            refreshEditor() {

            },
            clearEditor() {

            },
            //辅助函数
            animationDetailURL(id: number): string {
                return `#/animations/detail/${id}/`
            },
            playStatus(publishedQuantity: number, sumQuantity: number): string {
                if(sumQuantity == null) {
                    return null
                }else if(publishedQuantity == null) {
                    return `预计共${sumQuantity}话`
                }else if(publishedQuantity < sumQuantity) {
                    return `已发布${publishedQuantity}话，共${sumQuantity}话`
                }else{
                    return `已完结，共${sumQuantity}话`
                }
            },
            fmtPublishPlan(plan: string): string {
                let match = plan.match(/([0-9]+)-([0-9]+)-([0-9]+)T([0-9]+):([0-9]+)/)
                if(match) {
                    return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`
                }else{
                    return plan
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
            showMaker(detail) {
                return detail.originalWorkType || detail.originalWorkAuthors.length || detail.staffCompanies.length || detail.staffSupervisors.length
            },
            titleCol(title1: string, title2: string): string {
                if(title1 && title2) {
                    return `${title1} / ${title2}`
                }else if(title1) {
                    return title1
                }else{
                    return title2
                }
            }
        },
        created() {

        }
    })

    return vm
}