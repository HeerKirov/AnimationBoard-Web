(function () {
    const Vue = window['Vue']
    const client = window['client']
    const webURL = window['webURL']
    function getUrlParam(name) {
        const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)")
        const r = window.location.search.substr(1).match(reg)
        return r ? decodeURI(r[2]) : null
    }
    let vm = new Vue({
        el: '#main',
        data: {
            username: '',
            password: '',
            error: null
        },
        methods: {
            login() {
                if(this.username == null || this.username.length <= 0) {
                    this.error = '用户名不能为空。'
                }else if(this.password == null || this.password.length <= 0) {
                    this.error = '密码不能为空。'
                }else{
                    client.user.token.post({
                        username: this.username,
                        password: this.password
                    }, (ok, s, d) => {
                        if(ok) {
                            let token = d['token']
                            client.setToken(token)
                            let prevURL = getUrlParam('from')
                            if(prevURL) {
                                window.location.href = prevURL
                            }else{
                                window.location.href = `${webURL}/`
                            }
                        }else{
                            this.error = '登录失败。请检查用户名或密码。'
                        }
                    })
                }
            }
        }
    })
    window['vms']['main'] = vm
})()