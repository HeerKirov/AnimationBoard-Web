(function () {
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const webURL = window['webURL']
    const serverURL = window['serverURL']
    const setTitle = window['setTitle']
    const NO_COVER_URL = `${window['staticURL']}/images/no_cover.jpg`

    const FEED_LOAD_LIMIT = 20
    const FEED_ARTICLE_LENGTH = 140

    const PAGE_LIMIT_IN_TABLE = 20
    const SCORE_TITLE = [
        undefined,
        '差评', '略差', '平庸', '普通', '普通',
        '优良', '优良', '佳作', '佳作', '神作',
    ]
    const SCORE_DESCRIPTION = [
        undefined,
        /*0.5*/'实在是看不下去了',
        /*1.0*/'不知道好评点在哪里',
        /*1.5*/'平庸，没什么亮点',
        /*2.0*/'整体一般的作品，留不下什么深刻印象',
        /*2.5*/'普通的作品，说不上差但也谈不上好',
        /*3.0*/'整体良好，有观看体验',
        /*3.5*/'整体优秀，有不错的观看体验',
        /*4.0*/'高评价的佳作',
        /*4.5*/'殿堂级的佳作',
        /*5.0*/'足以称之为神作',
    ]
    const SORT_CHOICE = [
        {value: 'score',            title: '分数'},
        {value: 'animation__title', title: '标题'},
        {value: 'update_time',      title: '更新时间'},
        {value: 'create_time',      title: '首评时间'},
    ]
    function getHash(): {mode: 'feed' | 'rating' | 'detail', id?: number} {
        const FEED_REGEX = /#?\/?feed\/?/
        const RATING_REGEX = /#?\/?rating\/?/
        const DETAIL_REGEX = /#?\/?detail\/([0-9]+)\/?/
        let hash = window.location.hash
        if(!hash) {
            return {mode: 'feed'}
        }
        let found = hash.match(DETAIL_REGEX)
        if(found) {
            return {mode: 'detail', id: parseInt(decodeURIComponent(found[1]))}
        }
        found = hash.match(RATING_REGEX)
        if(found) {
            return {mode: 'rating'}
        }
        found = hash.match(FEED_REGEX)
        if(found) {
            return {mode: 'feed'}
        }
        return {mode: 'feed'}
    }

    let vm = new Vue({
        el: '#main',
        data: {
            mode: null,
            feed: {
                count: null,
                offset: 0,
                data: [],

                loading: false,
                needRefresh: true
            },
            rating: {
                data: []
            },
            detail: {
                animation: null,
                title: null,
                cover: null,
                score: 1,
                shortComment: null,
                article: null,

                mode: 'detail',     //detail | edit | new
                editor: {
                    score: null,
                    shortComment: null,
                    article: null
                }
            },
            filter: {
                search: '',
                notNull: true,
                scoreMin: null,
                scoreMax: null,

                show: false
            },
            sort: {
                title: SORT_CHOICE[0].title,
                by: 0,
                desc: true
            },
            pagination: {
                pageIndex: 1,   //当前页码
                pageLimit: PAGE_LIMIT_IN_TABLE,     //每页的最大条目数量
                count: 0,          //当前项目在数据库中的总数量
                maxPageIndex: 1,   //计算得到的最大页码数
                navigator: []      //生成的页码方案，方便绑定直接跳转页码
            },
            ui: {
                loading: false,
                errorInfo: null,
                parentAt: null
            }
        },
        computed: {
            sortChoices() {
                return SORT_CHOICE
            },
            scoreTitle() {
                return SCORE_TITLE
            },
            scoreDescription() {
                return SCORE_DESCRIPTION
            },
            parentURL() {
                return `#/${this.ui.parentAt || 'feed'}/`
            },

            editorScore() {
                let s = this.detail.editor.score
                let num = parseFloat(s)
                return isNaN(num) ? null : num > 5 ? 5 : num < 0.5 ? 0.5 : num
            }
        },
        watch: {

        },
        methods: {
            //导航逻辑
            hashChanged() {
                let {mode, id} = getHash()
                if(mode != this.mode || id != this.detail.animation) {
                    this.mode = mode
                    this.ui.errorInfo = null
                    this.filter.show = false
                    if(mode === 'feed') {
                        setTitle('动态')
                        this.ui.parentAt = 'feed'
                        if(this.feed.needRefresh) {
                            this.feed.needRefresh = false
                            this.clearFeed()
                            this.requestForFeed()
                        }
                    }else if(mode === 'rating') {
                        setTitle('评分表')
                        this.ui.parentAt = 'rating'
                        this.requestForRating()
                    }else if(mode === 'detail') {
                        setTitle('评价')
                        this.detail.animation = id
                        this.requestForDetail()
                    }
                }
            },
            //UI逻辑
            searchFor() {
                if(this.mode === 'feed') {
                    this.clearFeed()
                    this.requestForFeed()
                }else if(this.mode === 'rating') {
                    this.requestForRating()
                }
            },
            sortBy(index: number) {
                if(index === this.sort.by) {
                    this.sort.desc = !this.sort.desc
                }else{
                    this.sort.by = index
                    this.sort.title = SORT_CHOICE[index].title
                }
                this.requestForRating()
            },
            pageTo(pageIndex: number | 'first' | 'prev' | 'next' | 'last') {
                let goal
                if(pageIndex === 'first') {
                    goal = 1
                }else if(pageIndex === 'prev') {
                    goal = this.pagination.pageIndex > 1 ? this.pagination.pageIndex - 1 : 1
                }else if(pageIndex === 'next') {
                    goal = this.pagination.pageIndex < this.pagination.maxPageIndex ? this.pagination.pageIndex + 1 :
                        this.pagination.maxPageIndex > 0 ? this.pagination.maxPageIndex : 1
                }else if(pageIndex === 'last') {
                    goal = this.pagination.maxPageIndex > 0 ? this.pagination.maxPageIndex : 1
                }else if(typeof pageIndex === 'string') {
                    goal = parseInt(pageIndex)
                }else if(typeof pageIndex === 'number') {
                    goal = pageIndex
                }else{
                    goal = null
                }
                if(goal != null && goal !== this.pagination.pageIndex) {
                    this.pagination.pageIndex = goal
                    this.requestForRating()
                }
            },
            //feed 逻辑
            clearFeed() {
                this.feed.count = null
                this.feed.offset = 0
                this.feed.data = []
            },
            requestForFeed(force: boolean = false, callback: (ok) => void = null) {
                if(force || this.feed.offset < this.feed.count || this.feed.count == null) {
                    this.feed.loading = true
                    client.personal.comments.list({
                        offset: this.feed.offset,
                        limit: FEED_LOAD_LIMIT,
                        ordering: '-update_time, -id',
                        search: this.filter.search.trim() || null,
                    }, (ok, s, d) => {
                        this.feed.loading = false
                        if(ok) {
                            let data = ('results' in d && 'count' in d) ? d['results'] : d
                            this.feed.offset += data.length
                            this.feed.count = ('results' in d && 'count' in d) ? d['count'] : data.length
                            for(let item of data) {
                                this.feed.data.splice(this.feed.data.length, 0, this.formatForFeed(item))
                            }
                        }else{
                            this.ui.errorInfo = s === 401 ? '请先登录。' :
                                s === 403 ? '没有访问权限。' :
                                    s === 404 ? '找不到访问的资源。' :
                                        s === 500 ? '内部服务器发生预料之外的错误。' : '网络连接发生错误。'
                        }
                        if(callback != null) callback(ok)
                    })
                }
            },
            formatForFeed(data: any): any {
                return {
                    id: data.id,
                    animation: data.animation,
                    title: data.title,
                    cover: client.getCoverFile(data.cover) || NO_COVER_URL,
                    score: data.score,
                    shortComment: data.short_comment,
                    article: data.article != null ? (data.article.length > FEED_ARTICLE_LENGTH ? data.article.substr(0, FEED_ARTICLE_LENGTH) + '...' : data.article) : null,
                    createTime: new Date(data.create_time),
                    updateTime: new Date(data.update_time)
                }
            },
            //detail逻辑
            requestForDetail(useData?: any) {
                this.detail.mode = 'detail'
                if(useData != undefined) {
                    this.formatDetail(useData)
                }else{
                    this.ui.loading = true
                    let animationId = this.detail.animation
                    client.personal.comments.retrieve(animationId, (ok, s, d) => {
                        if(ok) {
                            this.formatDetail(d)
                            this.ui.loading = false
                        }else if(s === 404) {
                            //找不到资源，转换到新建模式
                            this.detail.mode = 'new'
                            client.database.animations.retrieve(animationId, (ok, s, d) => {
                                if(ok) {
                                    this.formatNew(d)
                                }else{
                                    this.ui.errorInfo = s === 400 ? '数据请求的格式错误。' :
                                                        s === 401 || s === 403 ? '没有权限。' :
                                                        s === 404 ? '找不到资源。' :
                                                        s === 500 ? '内部服务器发生预料之外的错误。' : '网络连接发生错误。'
                                }
                                this.ui.loading = false
                            })
                        }else{
                            this.ui.errorInfo = s === 400 ? '数据请求的格式错误。' :
                                                s === 401 || s === 403 ? '没有权限。' :
                                                s === 500 ? '内部服务器发生预料之外的错误。' : '网络连接发生错误。'
                            this.ui.loading = false
                        }

                    })
                }
            },
            formatDetail(data: any): any {
                setTitle(`${data.title} - 评价`)
                this.detail.title = data.title
                this.detail.cover = client.getCoverFile(data.cover) || NO_COVER_URL
                this.detail.score = data.score
                this.detail.shortComment = data.short_comment
                this.detail.article = data.article
            },
            formatNew(data: any): any {
                setTitle(`${data.title} - 评价`)
                this.detail.title = data.title
                this.detail.cover = client.getCoverFile(data.cover) || NO_COVER_URL
                this.detail.score = ''
                this.detail.shortComment = ''
                this.detail.article = ''
                this.detail.editor.score = ''
                this.detail.editor.shortComment = ''
                this.detail.editor.article= ''
            },
            switchToEditMode() {
                this.detail.editor.score = this.detail.score ? this.detail.score / 2 : null
                this.detail.editor.shortComment = this.detail.shortComment
                this.detail.editor.article = this.detail.article
                this.detail.mode = 'edit'
            },
            saveEditor() {
                if(this.detail.mode === 'edit') {
                    this.ui.loading = true
                    client.personal.comments.partialUpdate(this.detail.animation, {
                        score: (function (score) {
                            let s = parseFloat(score) * 2
                            return isNaN(s) ? null : s > 10 ? 10 : s < 1 ? 1 : s
                        })(this.detail.editor.score),
                        short_comment: this.detail.editor.shortComment || null,
                        article: this.detail.editor.article || null
                    }, (ok, s, d) => {
                        if(ok) {
                            this.feed.needRefresh = true
                            this.requestForDetail(d)
                        }else if(s != null) {
                            alert(`发生预料之外的错误。错误代码：${s}`)
                        }else{
                            alert('网络连接发生错误。')
                        }
                        this.ui.loading = false
                    })
                }else if(this.detail.mode === 'new') {
                    this.ui.loading = true
                    client.personal.comments.create({
                        animation: this.detail.animation,
                        score: (function (score) {
                            let s = parseFloat(score) * 2
                            return isNaN(s) ? null : s > 10 ? 10 : s < 1 ? 1 : s
                        })(this.detail.editor.score),
                        short_comment: this.detail.editor.shortComment || null,
                        article: this.detail.editor.article || null
                    }, (ok, s, d) => {
                        if(ok) {
                            this.feed.needRefresh = true
                            this.requestForDetail(d)
                        }else if(s != null) {
                            alert(`发生预料之外的错误。错误代码：${s}`)
                        }else{
                            alert('网络连接发生错误。')
                        }
                        this.ui.loading = false
                    })
                }
            },
            //rating逻辑
            requestForRating() {
                this.ui.loading = true
                client.personal.comments.list({
                    score__isnull: this.filter.notNull ? 'False' : 'True',
                    score__ge: this.filter.scoreMin ? parseFloat(this.filter.scoreMin) * 2 : undefined,
                    score__le: this.filter.scoreMax ? parseFloat(this.filter.scoreMax) * 2 : undefined,
                    search: this.filter.search.trim(),
                    ordering: `${this.sort.desc ? '-' : ''}${SORT_CHOICE[this.sort.by].value}, -id`,
                    limit: this.pagination.pageLimit,
                    offset: (this.pagination.pageIndex - 1) * this.pagination.pageLimit
                }, (ok, s, d) => {
                    if(ok) {
                        let data, count
                        if('results' in d && 'count' in d) {
                            data = d['results']
                            count = d['count']
                        }else{
                            data = d
                            count = d.length
                        }
                        this.rating.data = this.formatForRating(data)
                        this.pagination.count = count
                        this.generatePaginationNavigator()
                    }else{
                        this.ui.errorInfo = s === 400 ? '数据获取格式发生错误。' :
                                            s === 401 ? '未登录。请首先登录以获取权限。' :
                                            s === 403 ? '您的账户不具备当前操作的权限。' :
                                            s === 404 ? '未找到服务器地址。' :
                                            s === 500 ? '服务器发生未知的内部错误。' :
                                            s == null ? '无法连接到服务器。' : '发生未知的网络错误。'
                    }
                    this.ui.loading = false
                })
            },
            formatForRating(data: any[]): any[] {
                let ret = []
                for(let i of data) {
                    ret[ret.length] = {
                        animation: i.animation,
                        title: i.title,
                        score: i.score ? i.score / 2 : null,
                        updateTime: new Date(i.update_time)
                    }
                }
                return ret
            },
            generatePaginationNavigator() {
                this.pagination.maxPageIndex = Math.ceil(this.pagination.count / this.pagination.pageLimit)
                //处理导航器的页码分布
                if(this.pagination.maxPageIndex > 1 || this.pagination.pageIndex > this.pagination.maxPageIndex) {
                    const MAX_COUNT = 7
                    let first = this.pagination.pageIndex - Math.floor(MAX_COUNT / 2)
                    if(first + MAX_COUNT > this.pagination.maxPageIndex) {
                        first = this.pagination.maxPageIndex - MAX_COUNT + 1
                    }
                    if(first < 1) {
                        first = 1
                    }
                    let last = first + MAX_COUNT > this.pagination.maxPageIndex ? this.pagination.maxPageIndex : first + MAX_COUNT - 1
                    let arr = []
                    for(let i = first; i <= last; ++i) {
                        arr[arr.length] = i
                    }
                    this.pagination.navigator = arr
                }
            },
            //辅助函数
            star(score: number, color: string) {
                let ret = ''
                let cnt = Math.floor(score / 2)
                let half = score % 2
                for(let i = 0; i < cnt; ++i) ret += `<i class="star ${color} icon"></i>`
                if(half) ret += `<i class="star half ${color} icon"></i>`
                return ret
            },
            fmtStdDate(date: Date): string {
                if(date) {
                    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours() < 10 ? '0' : ''}${date.getHours()}:${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}`
                }else{
                    return null
                }
            },
            commentDetailURL(id: number): string {
                return `#/detail/${id}/`
            },
            animationDetailURL(animationId: number): string {
                return `${webURL}/database/#/animations/detail/${animationId}/`
            },
        },
        created() {
            this.hashChanged()
        }
    })

    $('#main .ui.dropdown.dropdown-menu').dropdown({action: 'hide'})
    $('#main .ui.dropdown.dropdown-select').dropdown({fullTextSearch: true})

    window.onhashchange = vm.hashChanged
    window['vms']['main'] = vm
})()