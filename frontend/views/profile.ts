(function () {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const setTitle = window['setTitle']
    const serverURL = window['serverURL']
    const NO_COVER_URL = `${window['staticURL']}/images/no_cover.jpg`

    let vm = new Vue({
        el: '#main',
        data: {
            info: {
                username: '',
                name: '',
                createTime: '',
                isStaff: false,
                isSuperuser: false,
                cover: '',
            },
            setting: {
                animationUpdateNotice: null,
                nightUpdateMode: null
            },
            password: {
                old: '',
                new: '',
                check: ''
            },
            ui: {
                tab: 0,
                errorInfo: null,

                editInfo: false,
                editNameText: '',
                editNameError: null,

                passwordOldError: null,
                passwordNewError: null,
                passwordCheckError: null
            }
        },
        methods: {
            hashChanged() {
                if(window.location.hash) {
                    let match = window.location.hash.match(/#\/?([a-zA-Z]*)\/?/)
                    if(match) {
                        let name = match[1]
                        if(name === 'setting') {
                            this.ui.tab = 1
                            setTitle('偏好设置')
                        }else if(name === 'password') {
                            this.ui.tab = 2
                            setTitle('密码')
                        }else{
                            this.ui.tab = 0
                            setTitle('资料卡片')
                        }
                    }else{
                        this.ui.tab = 0
                    }
                }else{
                    this.ui.tab = 0
                }
            },
            query() {
                client.profile.info.get((ok, s, d) => {
                    if(ok) {
                        this.info.username = d['username']
                        this.info.name = d['name']
                        this.info.createTime = (function (datetime) {
                            let match = datetime.match(/([0-9]+)-([0-9]+)-([0-9]+)/)
                            if(match) return `${match[1]}-${match[2]}-${match[3]}`
                            else return datetime
                        })(d['create_time'])
                        this.info.isStaff = d['is_staff']
                        this.info.isSuperuser = d['is_superuser']
                        this.info.cover = d['cover'] ? `${serverURL}/static/cover/${d['cover']}` : NO_COVER_URL
                        this.setting.animationUpdateNotice = d['animation_update_notice']
                        this.setting.nightUpdateMode = d['night_update_mode']
                    }else{
                        this.ui.errorInfo = s === 400 ? '请求的格式有预料之外的错误。':
                                        s === 401 ? '请先登录。' :
                                        s === 403 ? '访问被拒绝，没有所需的权限。' :
                                        s === 404 ? '找不到资源。' :
                                        s === 500 ? '内部服务器发生预料之外的错误。' : '网络连接发生错误。'
                    }
                })
            },
            switchEditInfo() {
                if(this.ui.editInfo) {
                    let newName = this.ui.editNameText.trim()
                    if(newName.length <= 0) {
                        this.ui.editNameError = '昵称不能为空。'
                    }else if(newName.length > 32) {
                        this.ui.editNameError = '昵称的长度不能超过32。'
                    }else {
                        this.ui.editNameError = null
                        if(newName != this.info.name) {
                            client.profile.info.partialUpdate(this.info.username, {name: newName}, (ok, s) => {
                                if(ok) {
                                    this.ui.editInfo = false
                                    this.info.name = newName
                                    window['vms']['top-bar'].profile.name = newName
                                }else if(s != null){
                                    alert(`发生预料之外的错误。错误代码：${s}`)
                                }else{
                                    alert('发生预料之外的错误。')
                                }
                            })
                        }else{
                            this.ui.editInfo = false
                        }
                    }
                }else{
                    this.ui.editNameText = this.info.name
                    this.ui.editNameError = null
                    this.ui.editInfo = true
                }
            },
            saveSetting() {
                client.profile.info.partialUpdate(this.info.username, {
                    animation_update_notice: this.setting.animationUpdateNotice,
                    night_update_mode: this.setting.nightUpdateMode
                }, (ok, s) => {
                    if(ok) {
                        //do nothing
                    }else if(s != null){
                        alert(`发生预料之外的错误。错误代码：${s}`)
                    }else{
                        alert('发生预料之外的错误。')
                    }
                })
            },
            savePassword() {
                this.ui.passwordOldError = this.ui.passwordNewError = this.ui.passwordCheckError = null
                let ok = true
                if(!this.password.old) {
                    this.ui.passwordOldError = '请输入旧密码。'
                    ok = false
                }
                if(!this.password.new) {
                    this.ui.passwordNewError = '新密码不能为空。'
                    ok = false
                }else if(this.password.new !== this.password.check) {
                    this.ui.passwordCheckError = '两次输入的密码不一致。'
                    ok = false
                }
                if(ok) {
                    client.profile.password.update(this.info.username, {
                        old_password: this.password.old,
                        new_password: this.password.new
                    }, (ok, s) => {
                        if(ok) {
                            this.password.old = this.password.new = this.password.check = ''
                        }else if(s === 401) {
                            this.ui.passwordOldError = '密码验证失败。'
                        }else if(s != null){
                            alert(`发生预料之外的错误。错误代码：${s}`)
                        }else{
                            alert('发生预料之外的错误。')
                        }
                    })
                }
            },
            openFileUpload() {
                $('#main #file-upload').click()
            },
            fileUpload() {
                let fileUpload = $('#main #file-upload').get(0)
                if(fileUpload) {
                    let file = fileUpload.files[0]
                    if(file != undefined) {
                        client.cover.profile(this.info.username, file, (ok, s, d) => {
                            if(ok) {
                                if(d && 'cover' in d) {
                                    this.info.cover = d['cover'] ? `${serverURL}/static/cover/${d['cover']}` : NO_COVER_URL
                                }
                            }else{
                                alert('新头像上传失败。')
                            }
                        })
                    }
                }
            }
        },
        created() {
            this.hashChanged()
            this.query()
        }
    })

    window.onhashchange = vm.hashChanged
    window['vms']['main'] = vm
})()