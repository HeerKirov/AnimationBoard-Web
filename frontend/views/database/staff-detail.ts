function createStaffDetailVue(selectName: string, location: {mode: string, tab: string, id: number | string, route(hash: string, params?: Object)}) {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const setTitle = window['setTitle']
    const serverURL = window['serverURL']

    const ABOUT_ANIMATION_COUNT = 6
    const NO_COVER_URL = `${window['staticURL']}/images/no_cover.jpg`

    let backend = null
    let backendId = null

    let vm = new Vue({
        el: selectName,
        data: {
            editMode: false,
            id: null,
            data: {
                id: null,
                name: null,
                originName: null,
                isOrganization: null
            },
            editor: {
                name: null,
                originName: null,
                isOrganization: null,
                nameError: null,
                originNameError: null
            },
            ui: {
                loading: false,
                errorInfo: null,

                animationByAuthors: [],
                animationByCompanies: [],
                animationBySupervisors: [],
            }
        },
        computed: {
            isStaff() {
                return window['vms']['top-bar'].profile.is_staff
            },
        },
        methods: {
            load(params?: Object) {
                this.refresh(params)
            },
            refresh(params?: Object) {
                this.editMode = location.mode === 'edit'
                setTitle(this.editMode ? '编辑STAFF' : 'STAFF')
                if(this.id == null || location.id != this.id || (params && params['refresh'])) {
                    this.id = location.id
                    this.query((ok) => {
                        if(ok) {
                            if(location.mode === 'detail') this.refreshDetail()
                            else if(location.mode === 'edit') this.refreshEditor()
                        }
                    })
                }else{
                    if(location.mode === 'edit') this.refreshEditor()
                }
            },
            leave() {},
            gotoAnimationList() {
                location.route('#/animations/', {search: this.data.name})
            },
            //数据逻辑
            query(callback?: (ok) => void) {
                this.ui.errorInfo = null
                this.ui.loading = true
                client.database.staffs.retrieve(this.id, (ok, s, d) => {
                    if(ok) {
                        backend = d
                        backendId = this.id
                        this.refreshDetail()
                    }else{
                        this.ui.errorInfo = s === 400 ? '数据获取格式发生错误。' :
                                            s === 401 ? '未登录。请首先登录以获取权限。' :
                                            s === 403 ? '您的账户不具备当前操作的权限。' :
                                            s === 404 ? '找不到此资源。' :
                                            s === 500 ? '服务器发生未知的内部错误。' :
                                            s == null ? '无法连接到服务器。' : '发生未知的网络错误。'
                    }
                    if(callback != null) callback(ok)
                    this.ui.loading = false
                })
                function requestCallback(field: string) {
                    return (ok, s, d) => {
                        if(ok) {
                            let result = 'results' in d ? d.results : d
                            let list = []
                            for(let animation of result) {
                                list[list.length] = {
                                    id: animation.id,
                                    title: animation.title,
                                    cover: client.getCoverFile(animation.cover) || NO_COVER_URL
                                }
                            }
                            vm.ui[field] = list
                        }else{
                            vm.ui[field] = []
                        }
                    }
                }
                client.database.animations.list({limit: ABOUT_ANIMATION_COUNT, original_work_authors: this.id, ordering: 'id'}, requestCallback('animationByAuthors'))
                client.database.animations.list({limit: ABOUT_ANIMATION_COUNT, staff_companies: this.id, ordering: 'id'}, requestCallback('animationByCompanies'))
                client.database.animations.list({limit: ABOUT_ANIMATION_COUNT, staff_supervisors: this.id, ordering: 'id'}, requestCallback('animationBySupervisors'))
            },
            refreshDetail() {
                if(backend) {
                    setTitle(`${backend.name} - STAFF`)
                    this.data.id = backend.id
                    this.data.name = backend.name
                    this.data.originName = backend.origin_name
                    this.data.isOrganization = backend.is_organization
                }
            },
            refreshEditor() {
                if(backend) {
                    setTitle(`${backend.name} - 编辑STAFF`)
                    this.editor.name = backend.name
                    this.editor.originName = backend.origin_name
                    this.editor.isOrganization = backend.is_organization
                    this.editor.nameError = null
                    this.editor.originNameError = null
                }
            },
            //编辑逻辑
            submit() {
                this.editor.nameError = null
                this.editor.originNameError = null
                let ok = true
                if(!this.editor.name || !this.editor.name.trim()) {
                    this.editor.nameError = '名字不能为空。'
                    ok = false
                }else if(this.editor.name.length > 64){
                    this.editor.nameError = '名字的长度不能超过64。'
                    ok = false
                }
                if(this.editor.originName && this.editor.originName.length > 64) {
                    this.editor.originNameError = '原名的长度不能超过64。'
                    ok = false
                }
                if(ok) {
                    this.ui.loading = true
                    let data = {name: this.editor.name.trim(), origin_name: this.editor.originName || null, is_organization: this.editor.isOrganization}
                    client.database.staffs.update(this.id, data, (ok, s, d) => {
                        this.ui.loading = false
                        if(ok) {
                            backend = null
                            backendId = null
                            location.route(`#/staffs/detail/${this.id}/`, {refresh: true})
                        }else if(s === 401 || s === 403) vm.ui.errorInfo = '您没有对条目作出变更的权限。'
                        else if(s === 500) alert('服务器发生预料之外的内部错误。')
                        else alert('网络连接发生错误。')
                    })
                }
            },
            //辅助函数
            animationDetailURL(id: number): string {
                return `#/animations/detail/${id}/`
            },
            staffDetailURL(id: number): string {
                return `#/staffs/detail/${id}/`
            },
            staffEditURL(id: number): string {
                return `#/staffs/edit/${id}/`
            }
        }
    })

    $(`${selectName} .ui.dropdown.dropdown-menu`).dropdown({action: 'hide'})
    $(`${selectName} .ui.dropdown.dropdown-select`).dropdown({fullTextSearch: true})
    $(`${selectName} .accordion`).accordion()
    return vm
}