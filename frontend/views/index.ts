(function () {
    const Vue = window['Vue']
    const client = window['client']

    const SEASON = ['冬', '春', '夏', '秋']

    let vm = new Vue({
        el: '#main',
        data: {
            profile: {
                cover: null,
                username: null,
                name: null,
                isAuthenticated: null
            },
            diary: {
                updateList: [],     //追番更新
                attachList: []      //补番状况
            },
            table: {

            }
        },
        computed: {
            season() {
                let date = new Date()
                let year = date.getFullYear()
                let season = Math.floor(date.getMonth() / 3)
                return `${year}年·${SEASON[season]}季`
            }
        },
        methods: {
            requestForDiary() {
                //请求diary的数据。登录时，这会同时生成diary和table项的数据。
                client.personal.diaries.list({
                    status: 'WATCHING',
                }, (ok, s, d) => {
                    if(ok) {

                    }
                })
            },
            requestForAnimationTable() {
                //未登录时，会请求animation list，来生成table。
            }
        },
        created() {
            window['vms']['top-bar'].delegateOnProfile((profile) => {
                this.profile.cover = profile.cover
                this.profile.username = profile.username
                this.profile.name = profile.name
                this.profile.isAuthenticated = profile.is_authenticated
            })
        }
    })

    window['vms']['main'] = vm
})()