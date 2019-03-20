function createTagListVue(selectName: string, location: {mode: string, tab: string, id: number | string}) {
    const Vue = window['Vue']
    const client = window['client']

    let vm = new Vue({
        el: selectName,
        data: {
            filter: {
                searchText: ''
            },
            data: [],
            panel: {
                loading: false,
                errorInfo: null
            }
        },
        computed: {
            isStaff() {
                return window['vms']['top-bar'].profile.is_staff
            }
        },
        methods: {
            load() {
                this.panel.errorInfo = null
                this.panel.loading = false
                this.query()
            },
            leave() {},
            //处理逻辑
            query() {
                this.panel.loading = true
                client.database.tags.list({search: this.filter.searchText.trim() || undefined, ordering: 'id'}, (ok, s, d) => {
                    if(ok) {
                        this.data = this.format(d)
                    }else{
                        this.panel.errorInfo = s === 400 ? '数据获取格式发生错误。' :
                                                s === 401 ? '未登录。请首先登录以获取权限。' :
                                                s === 403 ? '您的账户不具备当前操作的权限。' :
                                                s === 404 ? '未找到服务器地址。' :
                                                s === 500 ? '服务器发生未知的内部错误。' :
                                                s == null ? '无法连接到服务器。' :
                                                '发生未知的网络错误。'
                    }
                    this.panel.loading = false
                })
            },
            format(data: any[]): any[] {
                return data
            },
            //与构建有关的辅助函数
            tagDetailURL(tag: string): string {
                return `#/tags/detail/${encodeURIComponent(tag)}/`
            },
        }
    })

    return vm
}