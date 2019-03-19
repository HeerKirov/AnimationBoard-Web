(function () {
    const Vue = window['Vue']
    const client = window['client']
    const webURL = window['webURL']
    let vm = new Vue({
        el: '#top-bar',
        data: {
            profile: {
                is_authenticated: null,
                username: '',
                name: '',
                is_staff: null
            }
        },
        methods: {
            logout() {
                client.setToken(null)
                window.location.href = `${webURL}/login/`
            }
        },
        created() {
            client.profile.info.get((ok, s, d) => {
                if(ok) {
                    this.profile.is_authenticated = true
                    this.profile.username = d['username']
                    this.profile.name = d['name']
                    this.profile.is_staff = d['is_staff']
                }else{
                    this.profile.is_authenticated = false
                    this.profile.is_staff = false
                }
            })
        }
    })
    window['vms']['top-bar'] = vm
})()