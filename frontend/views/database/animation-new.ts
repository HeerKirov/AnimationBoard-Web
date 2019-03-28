function createAnimationNewVue(selectName: string, location: {mode: string, tab: string, id: number | string, params: Object, route(hash: string, params?: Object)}) {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const setTitle = window['setTitle']
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
            let result = func(i)
            if(result !== undefined) ret[ret.length] = result
        }
        return ret
    }
    function equals(a, b): boolean {
        if(a === b) return true
        let tA = typeof a, tB = typeof b
        if(tA !== tB) return false
        if(tA === 'object') {
            for(let key in a) if(!equals(a[key], b[key])) return false
            for(let key in b) if(!equals(a[key], b[key])) return false
            return true
        }else{
            return a === b
        }
    }

    function generateRelations(relation): Object {
        let ret = {}
        for(let r of RELATION_SEQUENCE) {
            let objList = []
            if(relation && relation[r]) {
                for(let obj of relation[r]) {
                    if(typeof obj === 'object') {
                        objList[objList.length] = {id: obj.id, title: obj.title, cover: obj.cover ? `${serverURL}/static/cover/${obj.cover}` : NO_COVER_URL}
                    }else{
                        objList[objList.length] = {id: obj, title: obj, cover: null}
                    }
                }
            }
            ret[r] = objList
        }
        return ret
    }
    function compareAndGetChange(oldData: any, newData: any, special?: {}): any {
        let ret = {}
        for(let key in newData) {
            if(key in oldData) {
                let oldValue = oldData[key]
                let newValue = newData[key]
                let eq = (special && key in special) ? special[key](oldValue, newValue) : equals(oldValue, newValue)
                if(!eq) ret[key] = newValue
            }else{
                ret[key] = newData[key]
            }
        }
        return ret
    }

    let backend: any = null   //edit模式时，备份原始数据
    let backendId: number = null
    let backup: any = null  //new模式时，备份编辑的数据
    let vm = new Vue({
        el: selectName,
        data: {
            editId: null,
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
                links: [],

                relationList: {}
            },
            ui: {
                errorInfo: null,
                loading: false,
                coverUploading: false,
                tagEditor: {
                    show: false,
                    tagList: [],    //全部的备选标签的列表
                    showResult: [], //在前端展示的搜索结果
                    search: '',     //标签搜索
                    searchFlag: false,  //标记是否存在搜索元素
                },
                staffEditor: {
                    show: false,
                    showResult: [],
                    search: '',
                    currentList: null,
                    title: null
                },
                relationEditor: {
                    tab: 0,         //正在选用的panel的编号
                    tabRelation: RELATION_SEQUENCE[0],   //正在选用的panel的relation value
                    search: '',
                    showResult: [],
                    searchLoading: false,
                    dragging: false
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
                for (let {value, title} of PUBLISH_TYPE_CHOICE) ret[value] = title
                return ret
            },
            originalWorkTypeChoices() {
                return ORIGINAL_WORK_TYPE_CHOICE
            },
            originalWorkTypeEnums() {
                let ret = {}
                for (let {value, title} of ORIGINAL_WORK_TYPE_CHOICE) ret[value] = title
                return ret
            },
            limitLevelChoices() {
                return LIMIT_LEVEL_CHOICE
            },
            limitLevelEnums() {
                let ret = {}
                for (let {value, title} of LIMIT_LEVEL_CHOICE) ret[value] = title
                return ret
            },
            relationChoices() {
                let ret = []
                for (let i = 0; i < RELATION_NAME.length; ++i) ret[i] = {
                    relation: RELATION_SEQUENCE[i],
                    name: RELATION_NAME[i]
                }
                return ret
            },
            relationNameEnums() {
                let ret = {}
                for (let i = 0; i < RELATION_NAME.length; ++i) ret[RELATION_SEQUENCE[i]] = RELATION_NAME[i]
                return ret
            },
            relationIndexReflect() {
                let ret = {}
                for (let i = 0; i < RELATION_SEQUENCE.length; ++i) ret[RELATION_SEQUENCE[i]] = i
                return ret
            },
            isStaff() {
                return window['vms']['top-bar'].profile.is_staff
            },
            simpleTitle() {
                //从title的值中推断出一个简单的字符串，通常用于relation搜索时的搜索建议。
                if (this.data.title) {
                    let space = this.data.title.indexOf(' ')
                    if (space >= 0) {
                        return this.data.title.substring(0, space)
                    } else {
                        return this.data.title
                    }
                } else {
                    return null
                }
            }
        },
        watch: {
            'ui.publishPlan.panel': function (val) {
                if (val === 'WEEK' && !this.ui.publishPlan.newWeekItemCount) {
                    let plan = this.data.publishPlan.length
                    if (this.data.sumQuantity != "" && this.data.publishedQuantity != "") {
                        let sum = parseInt(this.data.sumQuantity)
                        let published = parseInt(this.data.publishedQuantity)
                        if (sum - published - plan > 0) {
                            this.ui.publishPlan.newWeekItemCount = sum - published - plan
                        }
                    } else if (this.data.sumQuantity != "") {
                        let sum = parseInt(this.data.sumQuantity)
                        if (sum > plan) {
                            this.ui.publishPlan.newWeekItemCount = sum - plan
                        }
                    }
                }
            },
            'ui.tagEditor.search': function () {
                this.searchTag()
            },
            'ui.staffEditor.search': function () {
                this.searchStaff()
            }
        },
        methods: {
            load() {
                this.ui.loading = true
                if (window['vms']['top-bar'].profile.is_staff != null) doSomething(window['vms']['top-bar'].profile.is_staff)
                else client.profile.info.get((ok, s, d) => doSomething(ok && d && d['is_staff']))

                function doSomething(isStaff: boolean) {
                    if (isStaff) {
                        vm.updateTagList()
                        vm.updateStaffList()
                        vm.eventComeTo(() => {
                            vm.ui.loading = false
                        })
                    } else {
                        vm.ui.errorInfo = '您没有对条目作出变更的权限。'
                    }
                }
            },
            refresh() {
                $('#animation-new #trash-modal').modal('hide')
                if (window['vms']['top-bar'].profile.is_staff != null) doSomething(window['vms']['top-bar'].profile.is_staff)
                else client.profile.info.get((ok, s, d) => doSomething(ok && d && d['is_staff']))

                function doSomething(isStaff: boolean) {
                    if (isStaff) {
                        vm.eventLeaveFrom()
                        vm.eventComeTo()
                    } else {
                        vm.ui.errorInfo = '您没有对条目作出变更的权限。'
                    }
                }
            },
            leave() {
                this.eventLeaveFrom()
                $('#animation-new #trash-modal').modal('hide')
                this.ui.tagEditor.show = false
                this.ui.staffEditor.show = false
                this.ui.staffEditor.currentList = null
                this.ui.staffEditor.search = ''
                this.ui.publishPlan.panel = null
            },
            gotoStaffNew() {
                location.route('#/staffs/new/', {from: '#/animations/new/'})
            },
            //事件的次级程序
            eventComeTo(callback: (ok: boolean) => void = null) {
                if (location.mode === 'new') {
                    setTitle('新建番剧')
                    this.editId = null
                    if (backup != null) {
                        this.refreshByBackup(backup)
                        backup = null
                    } else {
                        this.clear()
                    }
                    if (callback != null) callback(true)
                } else if (location.mode === 'edit') {
                    setTitle('编辑番剧')
                    this.editId = location.id
                    if (backend != null && backendId != null && backendId === this.editId) {
                        this.refreshEditor()
                        if (callback != null) callback(true)
                    } else {
                        this.query((ok) => {
                            if (callback != null) callback(ok)
                        })
                    }
                }
            },
            eventLeaveFrom() {
                if (this.editId == null) {
                    backup = this.backupData()
                }
            },
            //作为编辑器的数据逻辑
            query(callback: (ok) => void = null) {
                this.ui.errorInfo = null
                client.database.animations.retrieve(this.editId, (ok, s, d) => {
                    if (ok) {
                        backendId = this.editId
                        backend = d
                        this.refreshEditor()
                    } else {
                        this.ui.errorInfo = s === 400 ? '数据获取格式发生错误。' :
                            s === 401 ? '未登录。请首先登录以获取权限。' :
                                s === 403 ? '您的账户不具备当前操作的权限。' :
                                    s === 404 ? '找不到此资源。' :
                                        s === 500 ? '服务器发生未知的内部错误。' :
                                            s == null ? '无法连接到服务器。' :
                                                '发生未知的网络错误。'
                    }
                    if (callback != null) {
                        callback(ok)
                    }
                })
            },
            refreshEditor() {
                let staffInfo = {}
                if ('staff_info' in backend) {
                    for (let info of backend['staff_info']) {
                        if (info && 'id' in info && 'name' in info) {
                            staffInfo[info.id] = info
                        }
                    }
                }
                setTitle(`${backend.title} - 编辑番剧`)
                this.data.title = backend.title
                this.data.originTitle = backend.origin_title
                this.data.otherTitle = backend.other_title
                this.data.staffSupervisors = mapArray(backend.staff_supervisors, (staffId) => {
                    return {id: staffId, name: staffInfo[staffId].name}
                })
                this.data.staffCompanies = mapArray(backend.staff_companies, (staffId) => {
                    return {id: staffId, name: staffInfo[staffId].name}
                })
                this.data.originalWorkAuthors = mapArray(backend.original_work_authors, (staffId) => {
                    return {id: staffId, name: staffInfo[staffId].name}
                })
                this.data.publishTime = backend.publish_time
                this.data.duration = backend.duration
                this.data.sumQuantity = backend.sum_quantity
                this.data.publishedQuantity = backend.published_quantity
                this.data.publishPlan = mapArray(backend.publish_plan, (d) => formatDateMinuteToStr(new Date(d)))
                this.data.subtitleList = mapArray(backend.subtitle_list, (link: string) => {
                    return {value: link}
                })
                this.data.tags = mapArray(backend.tags, (tag) => {
                    return {name: tag, id: null}
                })
                this.data.keyword = backend.keyword
                this.data.introduction = backend.introduction
                this.data.links = mapArray(backend.links, (link: string) => {
                    return {value: link}
                })
                this.data.relationList = generateRelations(backend.original_relations)
                $('#animation-new #original-work-type-picker').dropdown('set selected', backend.original_work_type || ' ')
                $('#animation-new #publish-type-picker').dropdown('set selected', backend.publish_type)
                $('#animation-new #publish-time-picker').calendar('set date', backend.publish_time, true, false)
                $('#animation-new #limit-level-picker').dropdown('set selected', backend.limit_level || ' ')
            },
            refreshByBackup(backup) {
                this.data.title = backup.title
                this.data.originTitle = backup.originTitle
                this.data.otherTitle = backup.otherTitle
                this.data.originalWorkAuthors = backup.originalWorkAuthors
                this.data.staffCompanies = backup.staffCompanies
                this.data.staffSupervisors = backup.staffSupervisors
                this.data.publishTime = backup.publishTime
                this.data.duration = backup.duration
                this.data.sumQuantity = backup.sumQuantity
                this.data.publishedQuantity = backup.publishedQuantity
                this.data.publishPlan = backup.publishPlan
                this.data.subtitleList = backup.subtitleList
                this.data.tags = backup.tags
                this.data.keyword = backup.keyword
                this.data.introduction = backup.introduction
                this.data.links = backup.links
                this.data.relationList = backup.relationList
                $('#animation-new #original-work-type-picker').dropdown('set selected', backup.originalWorkType)
                $('#animation-new #publish-type-picker').dropdown('set selected', backup.publishType)
                $('#animation-new #publish-time-picker').calendar('set date', backup.publishTime, true, false)
                $('#animation-new #limit-level-picker').dropdown('set selected', backup.limitLevel)
            },
            backupData(): any {
                return {
                    title: this.data.title,
                    originTitle: this.data.originTitle,
                    otherTitle: this.data.otherTitle,

                    originalWorkType: this.data.originalWorkType,
                    originalWorkAuthors: cloneArray(this.data.originalWorkAuthors),
                    staffCompanies: cloneArray(this.data.staffCompanies),
                    staffSupervisors: cloneArray(this.data.staffSupervisors),

                    publishType: this.data.publishType,
                    publishTime: this.data.publishTime,
                    duration: this.data.duration,
                    sumQuantity: this.data.sumQuantity,
                    publishedQuantity: this.data.publishedQuantity,
                    publishPlan: cloneArray(this.data.publishPlan),
                    subtitleList: cloneArray(this.data.subtitleList),

                    tags: cloneArray(this.data.tags),
                    limitLevel: this.data.limitLevel,
                    keyword: this.data.keyword,
                    introduction: this.data.introduction,
                    links: cloneArray(this.data.links),

                    relationList: this.data.relationList
                }
            },
            //数据逻辑
            updateTagList(callback: (ok) => void = null) {
                client.database.tags.list({ordering: 'id'}, (ok, s, d) => {
                    if (ok) {
                        let tagList = []
                        for (let tag of d) {
                            tagList[tagList.length] = {
                                id: tag.id,
                                name: tag.name
                            }
                        }
                        this.ui.tagEditor.tagList = tagList
                        this.searchTag()
                    } else {
                        console.error('Cannot request for tag list.')
                    }
                    if (callback != null) {
                        callback(ok)
                    }
                })
            },
            updateStaffList(callback: (ok) => void = null) {
                client.database.staffs.list({ordering: '-id'}, (ok, s, d) => {
                    if (ok) {
                        let orgList = [], personList = []
                        for (let staff of d) {
                            if (staff.is_organization) {
                                orgList[orgList.length] = {id: staff.id, name: staff.name}
                            } else {
                                personList[personList.length] = {id: staff.id, name: staff.name}
                            }
                        }
                        this.ui.staffListByOrg = concatArray(orgList, personList)
                        this.ui.staffListByPerson = concatArray(personList, orgList)
                    } else {
                        console.error('Cannot request for staff list.')
                    }
                    if (callback != null) {
                        callback(ok)
                    }
                })
            },
            validate(): boolean {
                for (let key in this.ui.error) this.ui.error[key] = null
                let ok = true
                let data = this.data

                function throwErr(key: string, content: string) {
                    ok = false
                    vm.ui.error[key] = content
                }

                if (data.title == null || !data.title.trim()) throwErr('title', '标题不能为空。')
                else if (data.title && data.title.length > 64) throwErr('title', '标题的长度不能超过64。')
                if (data.originTitle && data.originTitle.length > 64) throwErr('originTitle', '原标题的长度不能超过64。')
                if (data.otherTitle && data.otherTitle.length > 64) throwErr('otherTitle', '其他标题的长度不能超过64。')
                if (data.duration) {
                    let value = parseInt(data.duration)
                    if (isNaN(value)) throwErr('duration', '值必须是合法整数。')
                    else if (value < 0) throwErr('duration', '值不能小于0。')
                }
                let sumQuantity = null
                if (data.sumQuantity) {
                    let value = parseInt(data.sumQuantity)
                    if (isNaN(value)) throwErr('sumQuantity', '值必须是合法整数。')
                    else if (value < 0) throwErr('sumQuantity', '值不能小于0。')
                    if (ok) sumQuantity = value
                }
                let publishedQuantity = null
                if (data.publishedQuantity) {
                    let value = parseInt(data.publishedQuantity)
                    if (isNaN(value)) throwErr('publishedQuantity', '值必须是合法整数。')
                    else if (value < 0) throwErr('publishedQuantity', '值不能小于0。')
                    else if (sumQuantity != null && value > sumQuantity) throwErr('publishedQuantity', '已发布话数的值不能超过总话数。')
                    if (ok) publishedQuantity = value
                }
                if (data.publishPlan && sumQuantity != null && data.publishPlan.length + (publishedQuantity != null ? publishedQuantity : 0) > sumQuantity) {
                    throwErr('publishPlan', '放送计划的条目数加上已发布话数已经超过了总话数。')
                }
                if (data.subtitleList && sumQuantity != null && data.subtitleList.length > sumQuantity) {
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
                    original_work_authors: mapArray(data.originalWorkAuthors, (staff) => staff.id),
                    staff_companies: mapArray(data.staffCompanies, (staff) => staff.id),
                    staff_supervisors: mapArray(data.staffSupervisors, (staff) => staff.id),

                    publish_type: data.publishType,
                    publish_time: (function (publishTime) {
                        if (publishTime) {
                            let match = publishTime.match(/([0-9]+)-([0-9]+)/)
                            if (match) return `${match[1]}-${match[2]}-01`
                            else return publishTime
                        } else return null
                    })(data.publishTime),
                    duration: parseInt(data.duration),
                    sum_quantity: data.sumQuantity ? parseInt(data.sumQuantity) : null,
                    published_quantity: data.publishedQuantity ? parseInt(data.publishedQuantity) : null,
                    publish_plan: mapArray(data.publishPlan, (date) => {
                        function fmt(n) {return n < 10 ? `0${n}` : n}
                        let d = new Date(date)
                        return `${d.getUTCFullYear()}-${fmt(d.getUTCMonth() + 1)}-${fmt(d.getUTCDate())}T${fmt(d.getUTCHours())}:${fmt(d.getUTCMinutes())}:${fmt(d.getUTCSeconds())}Z`
                    }),
                    subtitle_list: mapArray(data.subtitleList, (subtitle) => subtitle.value),

                    tags: mapArray(data.tags, (tag) => tag.name),
                    limit_level: data.limitLevel && data.limitLevel != ' ' ? data.limitLevel : null,
                    keyword: data.keyword || null,
                    introduction: data.introduction || null,
                    links: mapArray(data.links, (link) => link.value),

                    original_relations: (function (relationList) {
                        let ret = {}
                        for (let r in relationList) {
                            let objList = relationList[r]
                            if (objList && objList.length) {
                                ret[r] = mapArray(objList, (obj) => obj.id)
                            }
                        }
                        return ret
                    })(data.relationList)
                }
            },
            generateNewTags(): string[] {
                let ret = []
                for (let tag of this.data.tags) {
                    if (!tag.id) {
                        let flag = true
                        for (let t of this.ui.tagEditor.tagList) {
                            if (t.name === tag.name) {
                                flag = false
                                break
                            }
                        }
                        if (flag) ret[ret.length] = tag.name
                    }
                }
                return ret
            },
            submit() {
                if (this.validate()) {
                    let data = this.generateData()
                    let newTags = this.generateNewTags()
                    let cover = generateCoverUpload()
                    if (cover != null) this.ui.coverUploading = true
                    submitCover(cover, (ok) => {
                        this.ui.coverUploading = false
                        if (!ok) {
                            alert('新封面上传失败。')
                        } else {
                            this.ui.loading = true
                            if (newTags.length) {
                                let remain = newTags.length
                                for (let tag of newTags) {
                                    client.database.tags.create({name: tag, introduction: null}, (ok, s) => {
                                        if (!ok) console.error(`Error happened while create tag "${tag}", status = ${s}`)
                                        if (--remain <= 0) submitAnimation(data)
                                    })
                                }
                            } else {
                                submitAnimation(data)
                            }
                        }
                    })
                }

                function generateCoverUpload(): File | null {
                    let fileUpload = $('#animation-new #file-upload').get(0)
                    if (fileUpload) {
                        let file = fileUpload.files[0]
                        if (file != undefined) {
                            return file
                        }
                    }
                    return null
                }

                function submitCover(file: File, callback?: (ok) => void) {
                    if (file != null) client.cover.animation(vm.editId, file, (ok) => {
                        if (callback != undefined) callback(ok)
                    })
                    else if (callback != undefined) callback(true)
                }

                function submitAnimation(data) {
                    if (vm.editId == null) {
                        client.database.animations.create(data, (ok, s, d) => {
                            if (ok) {
                                backup = null
                                vm.clear()
                                if (d && d.id) window.location.hash = `#/animations/detail/${d.id}/`
                                else window.location.hash = '#/animations/'
                            } else if (s === 401 || s === 403) vm.ui.errorInfo = '您没有创建新条目的权限。'
                            else if (s === 400) alert('发生预料之外的格式错误。')
                            else if (s === 500) alert('服务器发生预料之外的内部错误。')
                            else alert('网络连接发生错误。')
                            vm.ui.loading = false
                        })
                    } else {
                        let change = compareAndGetChange(backend, data, {
                            original_relations(oldValue, newValue) {
                                for (let r of RELATION_SEQUENCE) {
                                    if (oldValue[r] && newValue[r]) {
                                        if (oldValue[r].length != newValue[r].length) return false
                                        for (let i = 0; i < oldValue[r].length; ++i) {
                                            function getValue(value) {
                                                return typeof value === 'object' ? value.id : value
                                            }

                                            if (getValue(oldValue[r][i]) != getValue(newValue[r][i])) return false
                                        }
                                    } else if (oldValue[r] || newValue[r]) return false
                                }
                                return true
                            }
                        })
                        let id = vm.editId
                        client.database.animations.partialUpdate(id, change, (ok, s) => {
                            if (ok) {
                                backend = null
                                backendId = null
                                vm.clear()
                                location.route(`#/animations/detail/${vm.editId}/`, {refresh: true})
                            } else if (s === 401 || s === 403) vm.ui.errorInfo = '您没有对条目作出变更的权限。'
                            else if (s === 400) alert('发生预料之外的格式错误。')
                            else if (s === 500) alert('服务器发生预料之外的内部错误。')
                            else alert('网络连接发生错误。')
                            vm.ui.loading = false
                        })
                    }
                }
            },
            trash() {
                this.ui.loading = true
                client.database.animations.delete(this.editId, (ok, s) => {
                    if (ok) {
                        backend = null
                        backendId = null
                        vm.clear()
                        window.location.hash = `#/animations/`
                    } else {
                        this.ui.errorInfo = s === 400 ? '数据获取格式发生错误。' :
                            s === 401 ? '未登录。请首先登录以获取权限。' :
                                s === 403 ? '您的账户不具备当前操作的权限。' :
                                    s === 404 ? '找不到此资源。' :
                                        s === 500 ? '服务器发生未知的内部错误。' :
                                            s == null ? '无法连接到服务器。' : '发生未知的网络错误。'
                    }
                    this.ui.loading = true
                })
            },
            openTrashModal() {
                $('#animation-new #trash-modal').modal('show')
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
                this.data.sumQuantity = 12
                this.data.publishedQuantity = 0
                this.data.publishPlan = []
                this.data.subtitleList = []
                this.data.tags = []
                this.data.limitLevel = ' '
                this.data.keyword = null
                this.data.introduction = null
                this.data.links = []
                this.data.relationList = generateRelations(null)
                $('#animation-new #original-work-type-picker').dropdown('set selected', this.data.originalWorkType)
                $('#animation-new #publish-type-picker').dropdown('set selected', this.data.publishType)
                $('#animation-new #publish-time-picker').calendar('clear')
                $('#animation-new #limit-level-picker').dropdown('set selected', this.data.limitLevel)
            },
            //tag逻辑
            searchTag() {
                if (this.ui.tagEditor.search.trim()) {
                    let search = this.ui.tagEditor.search.trim().split(' ')
                    let result = []
                    for (let tag of this.ui.tagEditor.tagList) {
                        for (let s of search) {
                            if (tag.name.indexOf(s) >= 0) {
                                result[result.length] = tag
                                break
                            }
                        }
                    }
                    this.ui.tagEditor.showResult = result
                    this.ui.tagEditor.searchFlag = true
                } else {
                    this.ui.tagEditor.showResult = this.ui.tagEditor.tagList
                    this.ui.tagEditor.searchFlag = false
                }
            },
            addSearchAsNewTag() {
                if (this.ui.tagEditor.search.trim()) {
                    let search = this.ui.tagEditor.search.trim().split(' ')
                    for (let s of search) {
                        if (s) {
                            let flag = true
                            for (let t of this.data.tags) {
                                if (t && t.name === s) {
                                    flag = false
                                    break
                                }
                            }
                            if (flag) vm.$set(this.data.tags, this.data.tags.length, {name: s, id: null})
                        }
                    }
                    this.ui.tagEditor.search = ''
                }
            },
            addExistTag(tag: { id: number, name: string }) {
                for (let t of this.data.tags) if (t && t.name === tag.name) return
                vm.$set(this.data.tags, this.data.tags.length, tag)
            },
            removeTag(index: number) {
                this.data.tags.splice(index, 1)
            },
            //staff逻辑
            switchStaffEditor(type: 'staffCompanies' | 'staffSupervisors' | 'originalWorkAuthors' | null) {
                if (type != null) {
                    this.ui.staffEditor.show = true
                    this.ui.staffEditor.currentList = type === 'staffCompanies' ? this.data.staffCompanies :
                        type === 'staffSupervisors' ? this.data.staffSupervisors :
                            this.data.originalWorkAuthors
                    this.ui.staffEditor.title = type === 'staffCompanies' ? '制作公司' :
                        type === 'staffSupervisors' ? 'STAFF' : '原作者'
                    this.searchStaff()
                } else {
                    this.ui.staffEditor.show = false
                    this.ui.staffEditor.currentList = null
                    this.ui.staffEditor.title = null
                    this.ui.staffEditor.search = ''
                }
            },
            searchStaff() {
                if (this.ui.staffEditor.search.trim()) {
                    let search = this.ui.staffEditor.search.trim().toLowerCase().split(' ')
                    let result = []
                    for (let staff of (this.ui.staffEditor.currentList === this.data.staffCompanies ? this.ui.staffListByOrg : this.ui.staffListByPerson)) {
                        let lowerStaff = staff.name.toLowerCase()
                        for (let s of search) {
                            if (lowerStaff.indexOf(s) >= 0) {
                                result[result.length] = staff
                                break
                            }
                        }
                    }
                    this.ui.staffEditor.showResult = result
                } else {
                    this.ui.staffEditor.showResult = (this.ui.staffEditor.currentList === this.data.staffCompanies ? this.ui.staffListByOrg : this.ui.staffListByPerson)
                }
            },
            addExistStaff(staff: { id: number, name: string }) {
                for (let t of this.ui.staffEditor.currentList) if (t && t.id === staff.id) return
                vm.$set(this.ui.staffEditor.currentList, this.ui.staffEditor.currentList.length, staff)
            },
            removeStaff(index: number) {
                this.ui.staffEditor.currentList.splice(index, 1)
            },
            //relation逻辑
            switchRelationTab(index: number | null) {
                this.ui.relationEditor.tab = index
                this.ui.relationEditor.tabRelation = index != null ? RELATION_SEQUENCE[index] : null
                if (index != null) {
                    if (!this.data.relationList[this.ui.relationEditor.tabRelation]) this.data.relationList[this.ui.relationEditor.tabRelation] = []
                    this.ui.relationEditor.currentList = this.data.relationList[this.ui.relationEditor.tabRelation]
                } else {
                    this.ui.relationEditor.currentList = null
                }
            },
            searchRelation() {
                let searchText = this.ui.relationEditor.search.trim() || this.simpleTitle || null
                if (searchText) {
                    this.ui.relationEditor.searchLoading = true
                    this.ui.relationEditor.showResult = []
                    client.database.animations.list({search: searchText, ordering: '-update_time'}, (ok, s, d) => {
                        if (ok) {
                            let editId = parseInt(this.editId)
                            this.ui.relationEditor.showResult = mapArray(d, (item) => {
                                return item.id !== editId ? {
                                    id: item.id, title: item.title,
                                    cover: item.cover ? `${serverURL}/static/cover/${item.cover}` : NO_COVER_URL
                                } : undefined
                            })
                        } else if (s != null) {
                            alert(`查询发生错误。错误代码: ${s}`)
                        } else {
                            alert(`查询发生错误。`)
                        }
                        this.ui.relationEditor.searchLoading = false
                    })
                } else {
                    this.ui.relationEditor.showResult = []
                }
            },
            dragCurrentItem(event, index: number) {
                event.dataTransfer.setData('from', 'current')
                event.dataTransfer.setData('index', String(index))
                this.ui.relationEditor.dragging = true
            },
            dragSearchItem(event, index: number) {
                event.dataTransfer.setData('from', 'search')
                event.dataTransfer.setData('index', String(index))
                this.ui.relationEditor.dragging = true
            },
            dragItemEnd() {
                this.ui.relationEditor.dragging = false
            },
            dropOnTab(event, tab: string) {
                //tab: tab的名称
                let from = event.dataTransfer.getData('from')
                let eventIndex = parseInt(event.dataTransfer.getData('index') || null)
                if (from === 'current') {
                    this.moveCurrentItem(RELATION_SEQUENCE[this.ui.relationEditor.tab], eventIndex, tab, null)
                } else if (from === 'search') {
                    this.moveSearchItem(eventIndex, tab, null)
                }
            },
            dropOnCurrent(event, index: number | null) {
                //index: 放置的current item的下标，或放置在空白处时为null
                let from = event.dataTransfer.getData('from')
                let eventIndex = parseInt(event.dataTransfer.getData('index') || null)
                if (from === 'current') {
                    this.moveCurrentItem(RELATION_SEQUENCE[this.ui.relationEditor.tab], eventIndex, RELATION_SEQUENCE[this.ui.relationEditor.tab], index)
                } else if (from === 'search') {
                    this.moveSearchItem(eventIndex, RELATION_SEQUENCE[this.ui.relationEditor.tab], index)
                }
            },
            dropOnSearchField(event) {
                let from = event.dataTransfer.getData('from')
                let eventIndex = parseInt(event.dataTransfer.getData('index') || null)
                if (from === 'current') {
                    this.moveCurrentItem(RELATION_SEQUENCE[this.ui.relationEditor.tab], eventIndex, null, null)
                }
            },
            moveCurrentItem(fromTab: string, fromListIndex: number, toTab: string | null, toListIndex: number | null) {
                //toTab为null时，表示移除。
                //toListIndex为null时，表示追加到末尾。
                //需要注意tab相同时的各种重叠情况
                if (toTab == null) {
                    this.data.relationList[fromTab].splice(fromListIndex, 1)
                } else if (fromTab !== toTab) {
                    let item = this.data.relationList[fromTab].splice(fromListIndex, 1)[0]
                    this.data.relationList[toTab].splice(toListIndex != null ? toListIndex + 1 : this.data.relationList[toTab].length, 0, item)
                } else if (fromListIndex !== toListIndex) {
                    let list = this.data.relationList[fromTab]
                    let item = list.splice(fromListIndex, 1)[0]
                    if (toListIndex == null) toListIndex = list.length
                    else if (toListIndex < fromListIndex) toListIndex = toListIndex + 1
                    list.splice(toListIndex, 0, item)
                }
            },
            moveSearchItem(index: number, toTab: string, toListIndex: number | null) {
                let item = this.ui.relationEditor.showResult[index]
                if (item.id === parseInt(this.editId)) return
                for (let r in this.data.relationList) {
                    if (this.data.relationList[r]) {
                        let list = this.data.relationList[r]
                        for (let i = 0; i < list.length; ++i) {
                            let obj = list[i]
                            if (obj && obj.id === item.id) {
                                this.moveCurrentItem(r, i, toTab, toListIndex)
                                return
                            }
                        }
                    }
                }
                let goalList = this.data.relationList[toTab]
                goalList.splice(toListIndex != null || goalList.length, 0, {
                    id: item.id,
                    title: item.title,
                    cover: item.cover
                })
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
                if (this.ui.publishPlan.newGeneralTime) {
                    vm.$set(this.data.publishPlan, this.data.publishPlan.length, this.ui.publishPlan.newGeneralTime)
                    this.ui.publishPlan.newGeneralTime = null
                    $('#animation-new #new-general-publish-plan-picker').calendar('clear')
                }
            },
            addNewWeekPublishPlan() {
                if (this.ui.publishPlan.newWeekTime &&
                    this.ui.publishPlan.newWeekItemCount &&
                    this.ui.publishPlan.newWeekInterval) {
                    let count = parseInt(this.ui.publishPlan.newWeekItemCount)
                    let interval = parseInt(this.ui.publishPlan.newWeekInterval)
                    if (count > 0 && interval > 0) {
                        let timestamp = new Date(this.ui.publishPlan.newWeekTime).getTime()
                        for (let i = 0; i < count; ++i) {
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
            },
            //辅助函数
            animationDetailURL(id: number): string {
                return `#/animations/detail/${id}/`
            }
        }
    })

    $(`${selectName} .ui.dropdown.dropdown-menu`).dropdown({action: 'hide'})
    $(`${selectName} .ui.dropdown.dropdown-select`).dropdown({fullTextSearch: true})
    $(`${selectName} .accordion`).accordion()
    $(`${selectName} #trash-modal`).modal({
        detachable: false,
        duration: 200,
        onApprove() {
            vm.trash()
        }
    })
    $(`${selectName} #publish-time-picker`).calendar({
        type: 'month',
        formatter: {
            date(date, settings) {
                if (!date) return null
                let year  = date.getFullYear()
                let month = date.getMonth() + 1
                return `${year}-${month < 10 ? '0' : ''}${month}`
            }
        },
        onChange(date: Date, text: string, mode: string) {
            vm.data.publishTime = text || null
        }
    })
    $(`${selectName} #new-general-publish-plan-picker`).calendar({
        type: 'datetime',
        firstDayOfWeek: 1,
        ampm: false,
        formatter: {datetime: formatDateMinuteToStr},
        text: {months: MONTHS, monthsShort: MONTHS},
        onChange(date: Date, text: string) {
            vm.ui.publishPlan.newGeneralTime = text || null
        }
    })
    $(`${selectName} #new-week-publish-plan-picker`).calendar({
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