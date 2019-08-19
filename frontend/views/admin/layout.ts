(function () {
    const Vue = window['Vue']
    const client = window['client']
    const webURL = window['webURL']
    const serverURL = window['serverURL']
    const NO_COVER_URL = `${window['staticURL']}/images/no_cover.jpg`

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
            }
        },
        computed: {

        },
        methods: {
            logout() {
                client.setToken(null)
                window.location.href = `${webURL}/login/`
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
                    this.profile.cover = client.getCoverFile(d['cover']) || NO_COVER_URL
                    this.profile.night_update_mode = d['night_update_mode']
                    this.profile.animation_update_notice = d['animation_update_notice']
                    if(!this.profile.is_staff) {
                        window.location.href = `${webURL}/`
                    }else if(delegateList.length > 0) {
                        for(let delegate of delegateList) delegate(this.profile)
                        delegateList = []
                    }
                }else{
                    window.location.href = `${webURL}/`
                }
            })
        }
    })

    window['vms']['top-bar'] = vm
})()