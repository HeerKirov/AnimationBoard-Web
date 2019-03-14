(function () {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const webURL = window['webURL']

    let vm = new Vue({
        el: '#main',
        data: {
            username: '',
            name: '',
            password: '',
            passwordCheck: '',
            code: null,
            error: null
        },
        methods: {
            register() {
                if(this.username == null || this.username.length <= 0) {
                    this.error = '用户名不能为空。'
                }else if(this.name == null || this.name.length <= 0) {
                    this.error = '昵称不能为空。'
                }else if(this.password == null || this.password.length <= 0) {
                    this.error = '密码不能为空。'
                }else if(this.passwordCheck != this.password) {
                    this.error = '两次输入的密码不一致。'
                }else{
                    let username = this.username, password = this.password
                    client.user.register.post({
                        username,
                        name: this.name,
                        password,
                        registration_code: this.code || null
                    }, (ok, s, d) => {
                        if(ok) {
                            client.user.token.post({
                                username, password
                            }, (ok, s, d) => {
                                if(ok) {
                                    let token = d['token']
                                    client.setToken(token)
                                    window.location.href = `${webURL}/`
                                }else{
                                    window.location.href = `${webURL}/login/`
                                }
                            })
                        }else if('code' in d){
                            let code = d['code']
                            this.error = code === 'UserExists' ? '该用户名已存在。' :
                                    code === 'CodeForbidden' ? '注册失败。注册权限已被关闭(包括注册码)。' :
                                    code === 'RegisterForbidden' ? '注册失败。开放注册权限已被关闭。' :
                                    code === 'WrongKey' ? '使用了无效的注册码。请检查注册码拼写及注册码有效期。' :
                                    '注册失败。服务器发生未知的错误。'
                        }else if(s === 403){
                            this.error = '注册失败。注册已被权限禁用。'
                        }else{
                            this.error = '注册失败。服务器发生未知的错误。'
                        }
                    })
                }
            }
        }
    })
    window['vms']['main'] = vm
})()