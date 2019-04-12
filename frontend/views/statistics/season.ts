function createSeasonVue(selectName: string, location: {tab: string}) {
    const $ = window['$']
    const Vue = window['Vue']
    const Chart = window['Chart']
    const client = window['client']
    const webURL = window['webURL']
    const serverURL = window['serverURL']
    const NO_COVER_URL = `${window['staticURL']}/images/no_cover.jpg`

    const CHART_VIEW = [
        {value: 'count', title: '番剧数量'},
        {value: 'score', title: '评分'},
        {value: 'delay', title: '及时度'},
    ]
    const SEASON_NAME = ['冬', '春', '夏', '秋']
    const LIMIT_LEVEL = [
        {value: 'ALL', label: '全年龄', color: 'rgb(0, 183, 77)'},
        {value: 'R12', label: 'R12', color: 'rgb(0, 133, 204)'},
        {value: 'R15', label: 'R15', color: 'rgb(255, 189, 53)'},
        {value: 'R17', label: 'R17', color: 'rgb(251, 113, 47)'},
        {value: 'R18', label: 'R18', color: 'rgb(228, 40, 48)'},
        {value: 'R18G', label: 'R18G', color: 'rgb(101, 54, 196)'},
    ]
    const MAX_YEAR = new Date().getFullYear()
    const MAX_YEAR_MAX_SEASON = Math.floor(new Date().getMonth() / 3)
    const MIN_YEAR = 1995

    let tableData = {}
    let tableLimitLevelObject = null
    let chartData = null
    let chartObject = null

    let vm = new Vue({
        el: selectName,
        data: {
            tab: {                  //与tab面板控制相关
                chart: false,       //现在处于chart面板
                year: null,         //现在正在选定的年份
                season: null,       //现在正在选定的季度
                listYear: MAX_YEAR, //面板正在展示的年份
            },
            chart: {
                beginYear: MAX_YEAR - 2,
                endYear: MAX_YEAR,
                view: CHART_VIEW[0].value,
                viewTitle: CHART_VIEW[0].title,
                notExist: false
            },
            table: {
                count: null,
                scoreAvg: null,
                scoreMin: null,
                scoreMax: null,
                eachDelay: null,
                finishDelay: null,
                tags: [],
                limitLevel: [],
                animations: [],

                notExist: false,
            },
            ui: {
                loading: false,
                errorInfo: null
            }
        },
        computed: {
            seasonName() {
                return SEASON_NAME
            },
            maxYear() {
                return MAX_YEAR
            },
            maxYearMaxSeason() {
                return MAX_YEAR_MAX_SEASON
            },
            minYear() {
                return MIN_YEAR
            },
            currentSeasons() {
                if(this.tab.listYear >= this.maxYear) {
                    let ret = []
                    for(let i = 0; i <= this.maxYearMaxSeason; ++i) ret.splice(0, 0, i)
                    return ret
                }else{
                    return [3, 2, 1, 0]
                }
            },
            chartViewChoices() {
                return CHART_VIEW
            }
        },
        methods: {
            //UI导航事件
            navigateToChart() {
                this.tab.chart = true
                this.tab.year = null
                this.tab.season = null
                if(chartData == null) {
                    this.requestForChart()
                }
            },
            navigateYear(to: number | 'next' | 'prev') {
                if(to === 'next') to = this.tab.listYear + 1
                else if(to === 'prev') to = this.tab.listYear - 1
                if(to > MAX_YEAR) to = MAX_YEAR
                else if(to < MIN_YEAR) to = MIN_YEAR
                this.tab.listYear = to
            },
            navigateSeason(season: 0 | 1 | 2 | 3) {
                this.tab.chart = false
                this.tab.season = season
                this.tab.year = this.tab.listYear
                if(`${this.tab.year}-${this.tab.season}` in tableData) {
                    this.table.notExist = false
                    this.updateTable()
                }else{
                    this.requestForTable()
                }
            },
            //UI交互事件
            changeChartRange() {
                let min, max
                if(this.chart.endYear) {
                    try{
                        max = parseInt(this.chart.endYear)
                    }catch (e) {
                        max = MAX_YEAR
                    }
                    if(isNaN(max)) {
                        max = MAX_YEAR
                    }
                }
                if(this.chart.beginYear) {
                    try {
                        min = parseInt(this.chart.beginYear)
                    }catch (e) {
                        min = max - 2
                    }
                    if(isNaN(min) || min >= max) {
                        min = max - 2
                    }
                    if(min < MIN_YEAR) min = MIN_YEAR
                }
                this.chart.beginYear = min
                this.chart.endYear = max
                this.updateChart()
            },
            changeChartView(viewIndex: number) {
                this.chart.view = CHART_VIEW[viewIndex].value
                this.chart.viewTitle = CHART_VIEW[viewIndex].title
                this.updateChart()
            },
            refresh(generate?: boolean) {
                if(this.tab.chart) {
                    this.requestForChart(generate)
                }else{
                    this.requestForTable(generate)
                }
            },
            help() {
                $(`#season-help-modal`).modal('show')
            },
            //数据请求逻辑
            requestForChart(generate?: boolean) {
                this.ui.loading = true
                let call = (ok, s, d) => {
                    if(ok) {
                        chartData = this.formatForChart(d.content.seasons)
                        this.updateChart()
                        this.chart.notExist = false
                    }else if(s === 404) {
                        this.chart.notExist = true
                    }else{
                        this.ui.errorInfo = s === 400 ? '请求的格式发生意料之外的错误。' :
                                            s === 401 ? '请先登录。' :
                                            s === 403 ? '没有访问的权限。' :
                                            s === 500 ? '内部服务器错误。' : '网络连接发生错误。'
                        this.chart.notExist = false
                    }
                    this.ui.loading = false
                }
                if(generate === true) {
                    client.statistics.post({}, {type: 'season_chart'}, call)
                }else{
                    client.statistics.get({type: 'season_chart'}, call)
                }
            },
            requestForTable(generate?: boolean) {
                this.ui.loading = true
                let year = this.tab.year, season = this.tab.season
                let call = (ok, s, d) => {
                    if(ok) {
                        tableData[`${year}-${season}`] = this.formatForTable(d.content)
                        this.updateTable()
                        this.table.notExist = false
                    }else if(s === 404) {
                        this.table.notExist = true
                    }else{
                        this.ui.errorInfo = s === 400 ? '请求的格式发生意料之外的错误。' :
                                            s === 401 ? '请先登录。' :
                                            s === 403 ? '没有访问的权限。' :
                                            s === 500 ? '内部服务器错误。' : '网络连接发生错误。'
                        this.table.notExist = false
                    }
                    this.ui.loading = false
                }
                if(generate === true) {
                    client.statistics.post({}, {type: 'season_table', year, season}, call)
                }else{
                    client.statistics.get({type: 'season_table', year: this.tab.year, season: this.tab.season}, call)
                }
            },
            //数据处理逻辑
            formatForChart(d) {
                let data = {}
                for(let item of d) {
                    data[item.season] = item
                }
                return data
            },
            updateChart() {
                //更新chart的显示范围。
                if(chartData == null) return
                let labels = []
                let data = {
                    count: [],
                    scoreMin: [], scoreMax: [], scoreAvg: [],
                    eachDelay: [], finishDelay: []
                }
                for(let year = this.chart.beginYear; year <= this.chart.endYear; ++year) {
                    for(let season = 0; season < 4; ++season) {
                        labels[labels.length] = `${year}年${season * 3 + 1}月`
                        let item = chartData[`${year}-${season}`]
                        if(item) {
                            data.count[data.count.length] = item.count
                            data.scoreMin[data.scoreMin.length] = item.score_min / 2
                            data.scoreMax[data.scoreMax.length] = item.score_max / 2
                            data.scoreAvg[data.scoreAvg.length] = item.score_avg / 2
                            data.eachDelay[data.eachDelay.length] = item.each_delay_avg > 0 ? Math.floor(item.each_delay_avg / 24) : 0
                            data.finishDelay[data.finishDelay.length] = item.finish_delay_avg > 0 ? Math.floor(item.finish_delay_avg / 24) : 0
                        }else{
                            data.count[data.count.length] = null
                            data.scoreMin[data.scoreMin.length] = null
                            data.scoreMax[data.scoreMax.length] = null
                            data.scoreAvg[data.scoreAvg.length] = null
                            data.eachDelay[data.eachDelay.length] = null
                            data.finishDelay[data.finishDelay.length] = null
                        }
                    }
                }
                let dataSets
                switch (this.chart.view) {
                    case "count":
                        dataSets = [
                            {
                                label: '番剧数量',
                                backgroundColor: 'rgba(0, 133, 204, 1)',
                                data: data.count
                            }
                        ]
                        break
                    case "score":
                        dataSets = [
                            {
                                label: '最低分',
                                backgroundColor: 'rgba(233, 57, 150, 1)', //TODO 更改颜色
                                data: data.scoreMin
                            },
                            {
                                label: '平均分',
                                backgroundColor: 'rgba(168, 52, 196, 1)',
                                data: data.scoreAvg
                            },
                            {
                                label: '最高分',
                                backgroundColor: 'rgba(101, 54, 196, 1)',
                                data: data.scoreMax
                            }
                        ]
                        break
                    case "delay":
                        dataSets = [
                            {
                                label: '每话平均看完延时/天',
                                backgroundColor: 'rgba(180, 204, 55, 1)',
                                data: data.eachDelay
                            },
                            {
                                label: '全集看完延时/天',
                                backgroundColor: 'rgba(0, 186, 78, 1)',
                                data: data.finishDelay
                            }
                        ]
                        break
                }
                if(chartObject == null) {
                    chartObject = new Chart($(`${selectName} #chart`).get(0).getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: dataSets
                        },
                        options: {
                            scales: {yAxes: [{ticks: {beginAtZero: true}}]}
                        }
                    })
                }else{
                    chartObject.data.labels = labels
                    chartObject.data.datasets = dataSets
                    chartObject.update()
                }
            },
            formatForTable(d) {
                return d
            },
            updateTable() {
                let data = tableData[`${this.tab.year}-${this.tab.season}`]
                this.table.count = data.count
                this.table.scoreMax = data.score_max ? Math.round(data.score_max / 2 * 10) / 10 : '...'
                this.table.scoreMin = data.score_min ? Math.round(data.score_min / 2 * 10) / 10 : '...'
                this.table.scoreAvg = data.score_avg ? Math.round(data.score_avg / 2 * 10) / 10 : '...'
                this.table.eachDelay = data.each_delay_avg != null ? (data.each_delay_avg > 0 ? Math.floor(data.each_delay_avg / 24) : 0) : '...'
                this.table.finishDelay = data.finish_delay_avg != null ? (data.finish_delay_avg > 0 ? Math.floor(data.finish_delay_avg / 24) : 0) : '...'
                this.table.tags = data.tags
                let animations = []
                for(let animation of data.animations) {
                    animations[animations.length] = {
                        animationId: animation.animation_id,
                        title: animation.title,
                        cover: animation.cover ? `${serverURL}/static/cover/${animation.cover}` : NO_COVER_URL,
                        complete: animation.complete,
                        finishTime: animation.finish_time ? new Date(animation.finish_time) : null,
                        eachDelay: animation.each_delay_avg != null ? (animation.each_delay_avg > 0 ? Math.floor(animation.each_delay_avg / 24) : 0) : null,
                        finishDelay: animation.finish_delay != null ? (animation.finish_delay > 0 ? Math.floor(animation.finish_delay / 24) : 0) : null,
                        limitLevel: animation.limit_level,
                        score: animation.score ? animation.score / 2 : null
                    }
                }
                this.table.animations = animations

                let limitLevelLabels = [], limitLevelData = [], limitLevelColor = []
                for(let {value, label, color} of LIMIT_LEVEL) {
                    limitLevelLabels[limitLevelLabels.length] = label
                    limitLevelColor[limitLevelColor.length] = color
                    limitLevelData[limitLevelData.length] = value in data.limit_level ? data.limit_level[value] : 0
                }
                if(tableLimitLevelObject == null) {
                    tableLimitLevelObject = new Chart($(`${selectName} #table-limit-level`).get(0).getContext('2d'), {
                        type: 'doughnut',
                        data: {
                            labels: limitLevelLabels,
                            datasets: [
                                {
                                    data: limitLevelData,
                                    backgroundColor: limitLevelColor
                                }
                            ]
                        },
                        options: {
                            legend: {
                                position: 'right',
                                labels: {
                                    boxWidth: 20,
                                    fontSize: 10
                                }
                            }
                        }
                    })
                }else{
                    tableLimitLevelObject.data.datasets[0].data = limitLevelData
                    tableLimitLevelObject.update()
                }
            },

            animationDetailURL(animationId: number) {
                return `${webURL}/database/#/animations/detail/${animationId}/`
            },
            fmtStdDate(date: Date): string {
                if(date) {
                    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
                }else{
                    return null
                }
            },
            star(score: number, color: string) {
                let ret = ''
                let cnt = Math.floor(score / 2)
                let half = score % 2
                for(let i = 0; i < cnt; ++i) ret += `<i class="star ${color} icon"></i>`
                if(half) ret += `<i class="star half ${color} icon"></i>`
                return ret
            },
        },
        created() {
            this.navigateToChart()
        }
    })

    $(`${selectName} .ui.dropdown.dropdown-menu`).dropdown({action: 'hide'})
    $(`#season-help-modal`).modal({
        centered: false,
        duration: 200,
    })

    return vm
}