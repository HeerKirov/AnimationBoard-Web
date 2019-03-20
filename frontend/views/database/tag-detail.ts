function createTagDetailVue(selectName: string, location: {mode: string, tab: string, id: number | string, route(hash: string, params?: Object)}) {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const serverURL = window['serverURL']

    const ABOUT_ANIMATION_COUNT = 9
    const NO_COVER_URL = `${window['staticURL']}/images/no_cover.jpg`

    let backend = null
    let backendTag = null

    let vm = new Vue({
        el: selectName,
        data: {
            editMode: false,
            tag: null,
            data: {
                id: null,
                name: null,
                introduction: null
            },
            editor: {
                name: null,
                introduction: null,
                nameError: null
            },
            ui: {
                loading: false,
                errorInfo: null,

                animationList: []
            }
        },
        computed: {
            isStaff() {
                return window['vms']['top-bar'].profile.is_staff
            },
        },
        watch: {

        },
        methods: {
            /**进入的判定方式：
             *  load/refresh时检查tag的变化。tag变化时触发query，同时必定触发后续刷新事件。
             *  tag不变时，认为backend没有变化而不触发query，进入detail时不触发事件，进入edit时必定触发事件。
             */
            load(params?: Object) {
                this.refresh(params)
            },
            refresh(params?: Object) {
                this.editMode = location.mode === 'edit'
                if(this.tag == null || location.id != this.tag || (params && params['refresh'])) {
                    this.tag = location.id
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
                location.route('#/animations/', {tags: [this.tag]})
            },
            //数据逻辑
            query(callback?: (ok) => void) {
                this.ui.errorInfo = null
                this.ui.loading = true
                client.database.tags.retrieve(this.tag, (ok, s, d) => {
                    if(ok) {
                        backend = d
                        backendTag = this.tag
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
                client.database.animations.list({limit: ABOUT_ANIMATION_COUNT, tags__name: this.tag, ordering: 'id'}, (ok, s, d) => {
                    if(ok) {
                        let result = 'results' in d ? d.results : d
                        let list = []
                        for(let animation of result) {
                            list[list.length] = {
                                id: animation.id,
                                title: animation.title,
                                cover: animation.cover ? `${serverURL}/static/cover/${animation.cover}` : NO_COVER_URL
                            }
                        }
                        this.ui.animationList = list
                    }else{
                        this.ui.animationList = []
                    }
                })
            },
            refreshDetail() {
                if(backend) {
                    this.data.id = backend.id
                    this.data.name = backend.name
                    this.data.introduction = backend.introduction
                }
            },
            refreshEditor() {
                if(backend) {
                    this.editor.name = backend.name
                    this.editor.introduction = backend.introduction
                    this.editor.nameError = null
                }
            },
            //编辑逻辑
            submit() {
                if(!this.editor.name || !this.editor.name.trim()) {
                    this.editor.nameError = '标签名不能为空。'
                }else if(this.editor.name.length > 16){
                    this.editor.nameError = '标签名的长度不能超过16。'
                }else{
                    this.editor.nameError = null
                    this.ui.loading = true
                    let data = {name: this.editor.name.trim(), introduction: this.editor.introduction || null}
                    client.database.tags.update(this.tag, data, (ok, s, d) => {
                        this.ui.loading = false
                        if(ok) {
                            backend = null
                            backendTag = null
                            location.route(`#/tags/detail/${encodeURIComponent(data.name)}/`, {refresh: true})
                        }else if(s === 400 && 'name' in d && d['name'][0] === 'This field must be unique.')this.editor.nameError = '该标签名已经被使用过了。'
                        else if(s === 401 || s === 403) vm.ui.errorInfo = '您没有对条目作出变更的权限。'
                        else if(s === 500) alert('服务器发生预料之外的内部错误。')
                        else alert('网络连接发生错误。')

                    })
                }
            },
            //辅助函数
            animationDetailURL(id: number): string {
                return `#/animations/detail/${id}/`
            },
            tagDetailURL(tag: string): string {
                return `#/tags/detail/${encodeURIComponent(tag)}/`
            },
            tagEditURL(tag: string): string {
                return `#/tags/edit/${encodeURIComponent(tag)}/`
            }
        }
    })
    return vm
}