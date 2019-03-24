(function () {
    const Vue = window['Vue']
    const client = window['client']

    let vm = new Vue({
        el: '#main',
        data: {
            setting: {
                registerMode: null
            },
            info: null
        },
        methods: {
            requestForSetting() {
                client.admin.setting.get((ok, s, d) => {
                    if(ok) {
                        this.setting.registerMode = d['register_mode']
                    }
                })
            },
            saveSetting() {
                client.admin.setting.post({register_mode: this.setting.registerMode}, (ok, s, d) => {
                    if(ok) {
                        this.info = 'SUCCESS'
                    }else if(s != null) {
                        this.info = s
                    }else{
                        this.info = 'ERROR'
                    }
                })
            }
        },
        created() {
            this.requestForSetting()
        }
    })

    window['vms']['main'] = vm
})()