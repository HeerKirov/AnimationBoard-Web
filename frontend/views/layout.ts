(function () {
    const Vue = window['Vue']
    const $ = window['$']
    const client = window['client']
    const webURL = window['webURL']
    const serverURL = window['serverURL']
    const NO_COVER_URL = `${window['staticURL']}/images/no_cover.jpg`

    const MSG_TYPE = [
        {value: 'UPDATE', title: '番剧更新'},
        {value: 'CHAT', title: '私信聊天'},
        {value: 'SYS', title: '系统通知'},
    ]

    let delegateList = []

    let vm = new Vue({
        el: '#top-bar',
        data: {
            profile: {
                is_authenticated: null,
                is_staff: null,
                is_superuser: null,
                username: '',
                name: '',
                cover: null,

                night_update_mode: null,
                animation_update_notice: null
            },
            message: {
                unreadCount: 0,

                tab: 0,
                tabUnreadCount: [],
                tabItems: [],

                loading: false,
                errorInfo: null,
            }
        },
        computed: {
            msgTypeChoices() {
                return MSG_TYPE
            }
        },
        methods: {
            logout() {
                client.setToken(null)
                window.location.href = `${webURL}/login/`
            },
            //消息相关
            openMessageModal() {
                $('#message-modal').modal('show')
                this.requestMessageList()
            },
            requestUnreadCount() {
                client.profile.messages.unreadCount.get((ok, s, d) => {
                    if(ok) {
                        this.message.unreadCount = d['count']
                    }else{
                        console.warn(`request for unread message count failed: ${s}`)
                    }
                })
            },
            requestMessageList() {
                this.message.loading = true
                client.profile.messages.list({read: false}, (ok, s, d) => {
                    this.message.loading = false
                    if(ok) {
                        let col: any = {}
                        for(let i = 0; i < MSG_TYPE.length; ++i) {
                            let {value} = MSG_TYPE[i]
                            col[value] = {items: [], index: i}
                        }
                        for(let message of d) {
                            if(message.type === 'UPDATE') {
                                col['UPDATE'].items[col['UPDATE'].items.length] = {
                                    id: message.id,
                                    read: false,
                                    type: 'UPDATE',
                                    createTime: new Date(message.create_time),
                                    content: (function (content) {
                                        let ret = []
                                        for(let animation of content) {
                                            ret[ret.length] = {
                                                animationId: animation.animation_id,
                                                animationTitle: animation.animation_title,
                                                list: (function (from, to) {
                                                    let ret = []
                                                    for(let i = from; i < to; ++i) ret[ret.length] = i
                                                    return ret
                                                })(animation.range_old + 1, animation.range_new + 1),
                                            }
                                        }
                                        return ret
                                    })(message.content.update)
                                }
                            }else if(message.type === 'CHAT') {
                                col['CHAT'].items[col['CHAT'].items.length] = {
                                    id: message.id,
                                    read: false,
                                    type: 'CHAT',
                                    createTime: new Date(message.create_time),
                                    sender: message.sender,
                                    senderName: message.sender_name,
                                    content: message.content.content
                                }
                            }else if(message.type === 'SYS') {
                                col['SYS'].items[col['SYS'].items.length] = {
                                    id: message.id,
                                    read: false,
                                    type: 'SYS',
                                    createTime: new Date(message.create_time),
                                    content: message.content.content
                                }
                            }
                        }
                        for(let value in col) {
                            let {items, index} = col[value]
                            this.message.tabUnreadCount[index] = items.length
                            this.message.tabItems[index] = items
                        }
                    }else{
                        this.message.errorInfo = s === 400 ? '请求资源的格式错误。' :
                            s === 401 || s === 403 ? '没有访问权限。' :
                                s === 404 ? '找不到资源。' :
                                    s === 500 ? '内部服务器发生错误。' : '网络连接发生错误。'
                    }
                })
            },
            markAsRead(tab: number, index: number) {
                let msg = this.message.tabItems[tab][index]
                if(!msg.read) {
                    client.profile.messages.update(msg.id, {read: true}, (ok, s) => {
                        if(ok) {
                            msg.read = true
                            if(this.message.unreadCount > 0) this.message.unreadCount --
                            if(this.message.tabUnreadCount[tab] > 0) this.message.tabUnreadCount[tab] --
                        }else if(s != null) {
                            alert('标记时发生预料之外的错误。')
                        }else{
                            alert('网络连接发生错误。')
                        }
                    })
                }
            },
            markAllRead() {
                for(let tab = 0; tab < MSG_TYPE.length; ++tab) {
                    for(let i = 0; i < this.message.tabItems[tab].length; ++i) {
                        this.markAsRead(tab, i)
                    }
                }
            },
            //辅助函数
            fmtCreateTime(date: Date): string {
                return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours() < 10 ? '0' : ''}${date.getHours()}:${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}`
            },
            diaryDetailURL(animationId: number): string {
                return `${webURL}/personal/diaries/#/detail/${animationId}/`
            },
            joinCountRange(list: number[]): string {
                let ret = '', first = true
                for(let i of list) {
                    if(first) first = false
                    else ret += '、'
                    ret += i
                }
                return ret
            },
            //委托
            delegateOnProfile(delegate: (profile) => void) {
                if(this.profile.is_authenticated != null) {
                    delegate(this.profile)
                }else{
                    delegateList.splice(delegateList.length, 0, delegate)
                }
            }
        },
        created() {
            client.profile.info.get((ok, s, d) => {
                if(ok) {
                    this.profile.is_authenticated = true
                    this.profile.is_staff = d['is_staff']
                    this.profile.is_superuser = d['is_superuser']
                    this.profile.username = d['username']
                    this.profile.name = d['name']
                    this.profile.cover = d['cover'] ? `${serverURL}/static/cover/${d['cover']}` : NO_COVER_URL
                    this.profile.night_update_mode = d['night_update_mode']
                    this.profile.animation_update_notice = d['animation_update_notice']
                    this.requestUnreadCount()
                }else{
                    this.profile.is_authenticated = false
                    this.profile.is_staff = false
                }
                if(delegateList.length > 0) {
                    for(let delegate of delegateList) delegate(this.profile)
                    delegateList = []
                }
            })
        }
    })

    $('#message-modal').modal({
        duration: 200,
        centered: false
    })
    window['vms']['top-bar'] = vm
})()