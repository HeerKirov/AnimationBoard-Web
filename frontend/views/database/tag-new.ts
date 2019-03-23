function createTagNewVue(selectName: string, location: {mode: string, tab: string, id: number | string}) {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const setTitle = window['setTitle']
    const serverURL = window['serverURL']
    function newItem() {
        return {
            name: '', introduction: '',
            nameError: null
        }
    }
    let vm = new Vue({
        el: selectName,
        data: {
            items: [],
            tagCollection: {},
            ui: {
                errorInfo: null,
                loading: false
            }
        },
        computed: {

        },
        methods: {
            load() {
                setTitle('新建标签')
                this.ui.loading = true
                if(window['vms']['top-bar'].profile.is_staff != null) doSomething(window['vms']['top-bar'].profile.is_staff)
                else client.profile.info.get((ok, s, d) => doSomething(ok && d && d['is_staff']))
                function doSomething(isStaff: boolean) {
                    if(isStaff) {
                        vm.updateTagList()
                    }else{
                        vm.ui.errorInfo = '您没有创建新条目的权限。'
                    }
                    vm.ui.loading = false
                }
            },
            leave() {},
            //数据逻辑
            updateTagList() {
                //从服务器请求一份tag列表，用于name唯一性比对
                client.database.tags.list({}, (ok, s, d) => {
                    if(ok) {
                        let col = {}
                        for(let tag of d) col[tag.name] = tag.id
                        vm.tagCollection = col
                    }else{
                        console.error('cannot request for tag list.')
                    }
                })
            },
            validate(): boolean {
                let ok = true
                let tempCollection = {}
                for(let item of this.items) {
                    function throwErr(key: string, content: string) {
                        ok = false
                        item[key] = content
                    }
                    item.nameError = null
                    if(item.name == null || !item.name.trim()) throwErr('nameError', '标签名不能为空。')
                    else if(item.name.length > 16) throwErr('nameError', '标签名的长度不能超过16。')
                    else{
                        let name = item.name.trim()
                        if(name in this.tagCollection || name in tempCollection) throwErr('nameError', '该标签名已经被使用过了。')
                        else tempCollection[name] = null
                    }
                }
                return ok
            },
            generateData(): {name: string, introduction: string | null}[] {
                let ret = []
                for(let item of this.items) {
                    ret[ret.length] = {name: item.name, introduction: item.introduction || null}
                }
                return ret
            },
            submit() {
                if(this.validate()) {
                    let data = this.generateData()
                    this.ui.loading = true
                    let remain = data.length
                    let allSuccess = true
                    for(let i = 0; i < data.length; ++i) {
                        let item = data[i]
                        client.database.tags.create(item, (ok, s, d) => {
                            if(!ok) {
                                if (s != null) {
                                    alert(`提交"${item.name}"时发生错误。错误代码: ${s}`)
                                } else {
                                    alert(`提交"${item.name}"时发生预料之外的错误。`)
                                }
                                allSuccess = false
                            }
                            if(-- remain <= 0) finish()
                        })
                    }
                    function finish() {
                        vm.ui.loading = false
                        if(allSuccess) {
                            vm.clear()
                            window.location.hash = '#/tags/'
                        }
                    }
                }
            },
            clear() {
                this.items = [newItem()]
            },
            //UI逻辑
            addItem() {
                this.$set(this.items, this.items.length, newItem())
            },
            removeItem(index: number) {
                this.items.splice(index, 1)
            }
        },
        created() {
            this.clear()
        }
    })
    return vm
}