function createOverviewVue(selectName: string, location: {tab: string}) {
    const $ = window['$']
    const Vue = window['Vue']
    const Chart = window['Chart']
    const client = window['client']

    const SCORE_STD_COLOR = {r: 251, g: 113, b: 47}
    function generateScoreColor(base, lv) {
        return 255 - Math.round((255 - base) * lv / 10)
    }
    const LIMIT_LEVEL = [
        {value: 'ALL', label: '全年龄', color: 'rgb(0, 183, 77)'},
        {value: 'R12', label: 'R12', color: 'rgb(0, 133, 204)'},
        {value: 'R15', label: 'R15', color: 'rgb(255, 189, 53)'},
        {value: 'R17', label: 'R17', color: 'rgb(251, 113, 47)'},
        {value: 'R18', label: 'R18', color: 'rgb(228, 40, 48)'},
        {value: 'R18G', label: 'R18G', color: 'rgb(101, 54, 196)'},
    ]
    const PUBLISH_TYPE = [
        {value: 'GENERAL', label: 'TV & Web', color: 'rgb(0, 171, 163)'},
        {value: 'MOVIE', label: '剧场版动画', color: 'rgb(0, 133, 204)'},
        {value: 'OVA', label: 'OVA & OAD', color: 'rgb(180, 204, 55)'},
    ]
    const ORIGINAL_WORK_TYPE = [
        {value: 'NOVEL', label: '小说', color: 'rgb(170, 103, 68)'},
        {value: 'MANGA', label: '漫画', color: 'rgb(238, 40, 55)'},
        {value: 'GAME', label: '游戏', color: 'rgb(0, 183, 77)'},
        {value: 'ORI', label: '原创', color: 'rgb(0, 133, 204)'},
        {value: 'OTHER', label: '其他', color: 'rgb(233, 57, 150)'},
    ]

    let chartObject = {}
    function analyseChart(goal: 'score' | 'limit-level' | 'publish-type' | 'original-work-type', data) {
        if(chartObject[goal] == null) {
            chartObject[goal] = new Chart($(`${selectName} #${goal}`).get(0).getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: data.labels,
                    datasets: [
                        {
                            data: data.data,
                            backgroundColor: data.color
                        }
                    ]
                },
                options: {
                    aspectRatio: 1.4,
                    legend: {
                        labels: {
                            boxWidth: 10,
                            fontSize: 10
                        }
                    },
                    title: {
                        display: data.title != null,
                        text: data.title
                    }
                }
            })
        }else{
            chartObject[goal].data.datasets[0].data = data.data
            chartObject[goal].update()
        }
    }

    let vm = new Vue({
        el: selectName,
        data: {
            data: {
                count: null,
                scoreAvg: null
            },
            ui: {
                loading: false,
                errorInfo: null,
                notExist: false
            }
        },
        methods: {
            requestForOverview(generate?: boolean) {
                this.ui.loading = true
                let call = (ok, s, d) => {
                    if(ok) {
                        let data = this.formatForOverview(d.content)
                        try{this.updateOverView(data)}catch (e) {console.error(e)}
                        this.ui.notExist = false
                    }else if(s === 404) {
                        this.ui.notExist = true
                    }else{
                        this.ui.errorInfo = s === 400 ? '请求的格式发生意料之外的错误。' :
                                            s === 401 ? '请先登录。' :
                                            s === 403 ? '没有访问的权限。' :
                                            s === 500 ? '内部服务器错误。' : '网络连接发生错误。'
                        this.ui.notExist = false
                    }
                    this.ui.loading = false
                }
                if(generate === true) {
                    client.statistics.post({}, {type: 'overview'}, call)
                }else{
                    client.statistics.get({type: 'overview'}, call)
                }
            },
            formatForOverview(d) {
                return d
            },
            updateOverView(data) {
                this.data.count = data.count
                this.data.scoreAvg = Math.round(data.score_avg / 2 * 10) / 10

                let scoreLabels = [], scoreColor = [], scoreData = []
                for(let i = 10; i > 0; --i) {
                    scoreLabels[scoreLabels.length] = i / 2
                    scoreColor[scoreColor.length] = `rgb(${generateScoreColor(SCORE_STD_COLOR.r, i)}, ${generateScoreColor(SCORE_STD_COLOR.g, i)}, ${generateScoreColor(SCORE_STD_COLOR.b, i)})`
                    scoreData[scoreData.length] = data.score[i]
                }
                analyseChart('score', {labels: scoreLabels, data: scoreData, color: scoreColor, title: '评分分布'})

                let limitLevelLabels = [], limitLevelData = [], limitLevelColor = []
                for(let {value, label, color} of LIMIT_LEVEL) {
                    limitLevelLabels[limitLevelLabels.length] = label
                    limitLevelColor[limitLevelColor.length] = color
                    limitLevelData[limitLevelData.length] = value in data.limit_level ? data.limit_level[value] : 0
                }
                analyseChart('limit-level', {labels: limitLevelLabels, data: limitLevelData, color: limitLevelColor, title: '限制级分布'})

                let publishTypeLabels = [], publishTypeData = [], publishTypeColor = []
                for(let {value, label, color} of PUBLISH_TYPE) {
                    publishTypeLabels[publishTypeLabels.length] = label
                    publishTypeColor[publishTypeColor.length] = color
                    publishTypeData[publishTypeData.length] = value in data.publish_type ? data.publish_type[value] : 0
                }
                analyseChart('publish-type', {labels: publishTypeLabels, data: publishTypeData, color: publishTypeColor, title: '放送类型分布'})

                let originalWorkTypeLabels = [], originalWorkTypeData = [], originalWorkTypeColor = []
                for(let {value, label, color} of ORIGINAL_WORK_TYPE) {
                    originalWorkTypeLabels[originalWorkTypeLabels.length] = label
                    originalWorkTypeColor[originalWorkTypeColor.length] = color
                    originalWorkTypeData[originalWorkTypeData.length] = value in data.original_work_type ? data.original_work_type[value] : 0
                }
                analyseChart('original-work-type', {labels: originalWorkTypeLabels, data: originalWorkTypeData, color: originalWorkTypeColor, title: '原作类型分布'})

                let tagsLabels = [], tagsData = []
                for(let {name, count} of data.tags) {
                    tagsLabels[tagsLabels.length] = name
                    tagsData[tagsData.length] = count
                }
                if(chartObject['tags'] == null) {
                    chartObject['tags'] = new Chart($(`${selectName} #tags`).get(0).getContext('2d'), {
                        type: 'horizontalBar',
                        data: {
                            labels: tagsLabels,
                            datasets: [
                                {
                                    data: tagsData,
                                    backgroundColor: 'rgb(0, 133, 204)'
                                }
                            ]
                        },
                        options: {
                            title: {display: true, text: '标签分布'},
                            aspectRatio: 50 / tagsData.length,
                            legend: {display: false}
                        }
                    })
                }else{
                    chartObject['tags'].data.labels = tagsLabels
                    chartObject['tags'].data.datasets[0].data = tagsData
                    chartObject['tags'].update()
                }
            },

            refresh(generate?: boolean) {
                this.requestForOverview(generate)
            }
        },
        created() {
            this.requestForOverview()
        }
    })
    $(`${selectName} .ui.dropdown.dropdown-menu`).dropdown({action: 'hide'})

    return vm
}