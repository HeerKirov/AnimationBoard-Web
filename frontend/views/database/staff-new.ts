function createStaffNewVue(selectName: string, location: {mode: string, tab: string, id: number | string}) {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const serverURL = window['serverURL']
    function newItem() {
        return {
            name: '', originName: '', isOrganization: null,
            nameError: null, originNameError: null, isOrgError: null
        }
    }
    let vm = new Vue({
        el: selectName,
        data: {
            items: [],
            ui: {
                errorInfo: null,
                loading: false
            }
        },
        computed: {

        },
        methods: {
            load() {
                this.ui.loading = true
                if(window['vms']['top-bar'].profile.is_staff != null) doSomething(window['vms']['top-bar'].profile.is_staff)
                else client.profile.info.get((ok, s, d) => doSomething(ok && d && d['is_staff']))
                function doSomething(isStaff: boolean) {
                    if(isStaff) {
                        //do nothing
                    }else{
                        vm.ui.errorInfo = '您没有创建新条目的权限。'
                    }
                    vm.ui.loading = false
                }
            },
            leave() {},
            //数据逻辑
            validate(): boolean {
                let ok = true
                for(let item of this.items) {
                    function throwErr(key: string, content: string) {
                        ok = false
                        item[key] = content
                    }
                    item.nameError = null
                    item.originNameError = null
                    item.isOrgError = null
                    if(item.name == null || !item.name.trim()) throwErr('nameError', '名字不能为空。')
                    else if(item.name.length > 64) throwErr('nameError', '名字的长度不能超过64。')
                    if(item.originName != null && item.originName.length > 64) throwErr('originNameError', '原名的长度不能超过64。')
                    if(item.isOrganization == null) throwErr('isOrgError', '必须选择类型。')
                }
                return ok
            },
            generateData(): {name: string, originName: string, isOrganization: boolean | null}[] {
                let ret = []
                for(let item of this.items) {
                    ret[ret.length] = {name: item.name, origin_name: item.originName || null, is_organization: item.isOrganization}
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
                        client.database.staffs.create(item, (ok, s) => {
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
                            window.location.hash = '#/staffs/'
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