function createTimelineVue(selectName: string, location: {tab: string}) {
    const $ = window['$']
    const Vue = window['Vue']
    const Chart = window['Chart']
    const client = window['client']

    const DEFAULT_CHART_RANGE = 23
    const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
    const DEFAULT_MONTH_LABEL = '{year}年{month}月'
    const CHART_VIEW = [
        {value: 'count', title: '番剧数量'},
        {value: 'sum_quantity', title: '番剧集数总和'},
        {value: 'sum_duration', title: '番剧时长总和/分钟'},
    ]
    const CHART_VIEW_COLOR = {
        count: 'rgb(0, 133, 204)',
        sum_quantity: 'rgb(101, 54, 196)',
        sum_duration: 'rgb(157, 105, 70)'
    }
    function fmtUTCDate(d: Date) {
        function fmt(n) {return n < 10 ? `0${n}` : n}
        return `${d.getUTCFullYear()}-${fmt(d.getUTCMonth() + 1)}-${fmt(d.getUTCDate())}T${fmt(d.getUTCHours())}:${fmt(d.getUTCMinutes())}:${fmt(d.getUTCSeconds())}Z`
    }
    function generateMonthLabel(label, year, month) {
        return label ? label.replace('{year}', year).replace('{month}', month) : null
    }
    function formatDateMinuteToStr(datetime: Date): string {
        if (!datetime) return null
        let year   = datetime.getFullYear()
        let month  = datetime.getMonth() + 1
        let day    = datetime.getDate()
        let hour   = datetime.getHours()
        let minute = datetime.getMinutes()

        function fmt(n) {
            return n < 10 ? `0${n}` : n
        }

        return `${year}-${fmt(month)}-${fmt(day)} ${fmt(hour)}:${fmt(minute)}`
    }

    let details = {}
    let chartObject = null
    let rangeSelectorInited = false
    let editTimePickerInited = false

    let vm = new Vue({
        el: selectName,
        data: {
            records: [],
            data: {
                tab: null,          //当前面板
                key: null,          //处于info/edit面板时，选择项的key
                title: null,        //处于info/edit面板时，选择项的title

                labels: [],          //标签单元
                rangeBegin: null,   //截取一段的开始下标
                rangeEnd: null,     //截取一段的终止下标，包括
                view: CHART_VIEW[0].value,      //视图类型
                viewTitle: CHART_VIEW[0].title
            },
            edit: {
                key: null,
                title: null,
                partitions: [],

                panel: null,        //添加面板，可用'std', 'month'
                month: {
                    beginTime: null,
                    endTime: null,
                    label: DEFAULT_MONTH_LABEL
                },
                std: {
                    beginTime: null,
                    endTime: null,
                    label: null
                },

                keyError: null
            },
            ui: {
                loading: false,
                errorInfo: null
            }
        },
        computed: {
            chartViewChoices() {
                return CHART_VIEW
            }
        },
        methods: {
            //UI
            navigateToSelect() {
                this.data.tab = 'select'
                this.requestForList()
            },
            navigateToInfo(key: string) {
                this.data.tab = 'info'
                this.data.key = key
                for(let record of this.records) {
                    if(record.key === key) {
                        this.data.title = record.title || record.key
                        break
                    }
                }
                if(details[key]) {
                    this.updateForLabelTool()
                    this.updateForDetail()
                }else{
                    this.requestForDetail()
                }
            },
            navigateToEdit() {
                if(this.data.tab === "info" && this.data.key != null) {
                    this.data.tab = 'edit'
                    this.edit.key = this.data.key
                    this.edit.title = this.data.title
                    this.edit.keyError = null
                    let partitions = []
                    for(let mode of details[this.data.key].mode) {
                        partitions[partitions.length] = {
                            label: mode.label,
                            begin: new Date(mode.begin),
                            end: new Date(mode.end)
                        }
                    }
                    this.edit.partitions = partitions
                    if(!editTimePickerInited) {
                        initializeTimePicker()
                        editTimePickerInited = true
                    }
                }
            },
            navigateToCreate() {
                this.data.tab = 'create'
                this.data.key = null
                this.data.title = null
                this.edit.key = null
                this.edit.title = null
                this.edit.partitions = []
                this.edit.keyError = null
                if(!editTimePickerInited) {
                    initializeTimePicker()
                    editTimePickerInited = true
                }
            },
            help() {
                $(`#timeline-help-modal`).modal('show')
            },
            //info功能
            changeSelector(type: 'begin' | 'end', toIndex: number) {
                if(toIndex < 0) toIndex = 0
                else if(toIndex >= this.data.labels.length) toIndex = this.data.labels.length - 1
                if(type === 'begin') {
                    if(this.data.rangeBegin !== toIndex && toIndex <= this.data.rangeEnd) {
                        this.data.rangeBegin = toIndex
                        this.updateForDetail()
                    }
                }else{
                    if(this.data.rangeEnd !== toIndex && toIndex >= this.data.rangeBegin) {
                        this.data.rangeEnd = toIndex
                        this.updateForDetail()
                    }
                }
            },
            changeView(index: number) {
                if(this.data.view !== CHART_VIEW[index].value) {
                    this.data.view = CHART_VIEW[index].value
                    this.data.viewTitle = CHART_VIEW[index].title
                    this.updateForDetail()
                }
            },
            //edit|create功能
            changeEditPanel(to: string) {
                if(this.edit.panel === to) {
                    this.edit.panel = null
                }else{
                    this.edit.panel = to
                }
            },
            addMonthPartition() {
                if(this.edit.month.endTime == null) this.edit.month.endTime = new Date()
                if(this.edit.month.beginTime != null && this.edit.month.beginTime <= this.edit.month.endTime) {
                    let year = this.edit.month.beginTime.getFullYear(), month = this.edit.month.beginTime.getMonth()
                    let maxYear = this.edit.month.endTime.getFullYear(), maxMonth = this.edit.month.endTime.getMonth()
                    let results = []
                    while((year === maxYear && month <= maxMonth) || year < maxYear) {
                        results[results.length] = {
                            label: generateMonthLabel(this.edit.month.label, year, month + 1),
                            begin: new Date(year, month, 1),
                            end: new Date(month >= 11 ? year + 1 : year, month >= 11 ? 0 : month + 1, 1)
                        }
                        if(month >= 11) {
                            year ++
                            month = 0
                        }else{
                            month ++
                        }
                    }
                    this.addPartition(results)
                }
                this.edit.month.beginTime = null
                this.edit.month.endTime = null
                $(`${selectName} #month-begin-time-picker`).calendar('clear')
                $(`${selectName} #month-end-time-picker`).calendar('clear')
            },
            addStdPartition() {
                if(this.edit.std.beginTime == null) alert('开始时间不能为空。')
                else if(this.edit.std.endTime == null) alert('结束时间不能为空。')
                else if(!this.edit.std.label) alert('标签不能为空。')
                else{
                    this.addPartition([{
                        label: this.edit.std.label.trim(),
                        begin: this.edit.std.beginTime,
                        end: this.edit.std.endTime
                    }])
                    this.edit.std.beginTime = null
                    this.edit.std.endTime = null
                    $(`${selectName} #std-begin-time-picker`).calendar('clear')
                    $(`${selectName} #std-end-time-picker`).calendar('clear')
                }
            },
            addPartition(partitions: {label, begin, end}[]) {
                for(let partition of partitions) {
                    for(let i = 0; i <= this.edit.partitions.length; ++i) {
                        if(i == this.edit.partitions.length || partition.begin >= this.edit.partitions[i].begin){
                            this.edit.partitions.splice(i, 0, partition)
                            break
                        }
                    }
                }
            },
            removePartition(index: number) {
                this.edit.partitions.splice(index, 1)
            },
            saveEditor() {
                let create = this.data.tab === 'create'
                this.edit.keyError = null
                if(!this.edit.key) {
                    this.edit.keyError = '必须填写一个有效ID。'
                    return
                }
                let key = this.edit.key.trim()
                if(create) {
                    for(let record of this.records) {
                        if(record.key === key) {
                            this.edit.keyError = '这个ID已经存在。'
                            return
                        }
                    }
                }
                this.ui.loading = true
                let partitions = []
                for(let partition of this.edit.partitions) {
                    partitions[partitions.length] = {
                        label: partition.label,
                        begin: fmtUTCDate(partition.begin),
                        end: fmtUTCDate(partition.end)
                    }
                }
                let title = this.edit.title
                client.statistics.post({title, mode: partitions}, {type: 'timeline', key}, (ok, s, d) => {
                    if(ok) {
                        try {
                            if(create) {
                                this.records[this.records.length] = {key, title}
                            }else{
                                for(let record of this.records) {
                                    if(record.key === key) {
                                        record.title = title
                                        break
                                    }
                                }
                            }
                            details[key] = this.formatForDetail(d.content)
                            this.navigateToInfo(key)
                        }catch (e) {
                            console.error(e)
                        }
                    }else{
                        alert(s != null ? `发生错误。错误代码：${s}` : '网络连接发生错误。')
                    }
                    this.ui.loading = false
                })

            },
            //请求
            requestForList() {
                this.ui.loading = true
                client.statistics.get({type: 'timeline_record'}, (ok, s, d) => {
                    if(ok) {
                        let records = d.content.records
                        if(records) {
                            this.records = records
                        }else{
                            this.records = []
                        }
                    }else if(s === 404) {
                        this.records = []
                    }else{
                        this.ui.errorInfo = s === 400 ? '请求的格式发生意料之外的错误。' :
                                            s === 401 ? '请先登录。' :
                                            s === 403 ? '没有访问的权限。' :
                                            s === 500 ? '内部服务器错误。' : '网络连接发生错误。'
                        this.ui.notExist = false
                    }
                    this.ui.loading = false
                })
            },
            requestForDetail() {
                this.ui.loading = true
                let key = this.data.key
                client.statistics.get({type: 'timeline', key}, (ok ,s, d) => {
                    if(ok) {
                        try{
                            details[key] = this.formatForDetail(d.content)
                            this.updateForLabelTool()
                            this.updateForDetail()
                        }catch (e) {
                            console.error(e)
                        }
                    }else{
                        this.ui.errorInfo = s === 400 ? '请求的格式发生意料之外的错误。' :
                                            s === 401 ? '请先登录。' :
                                            s === 403 ? '没有访问的权限。' :
                                            s === 500 ? '内部服务器错误。' : '网络连接发生错误。'
                    }
                    this.ui.loading = false
                })
            },
            //数据处理
            formatForDetail(d) {
                d.partitions.reverse()
                return d
            },
            updateForLabelTool(){
                if(!rangeSelectorInited) {
                    $(`${selectName} #range-begin-selector`).dropdown({action: 'hide'})
                    $(`${selectName} #range-end-selector`).dropdown({action: 'hide'})
                    $(`${selectName} #view-selector`).dropdown({action: 'hide'})
                    rangeSelectorInited = true
                }
                let partitions = details[this.data.key].partitions
                let labels = []
                for(let partition of partitions) {
                    labels[labels.length] = partition.label
                }
                this.data.labels = labels
                this.data.rangeEnd = labels.length - 1
                this.data.rangeBegin = labels.length - 1 > DEFAULT_CHART_RANGE ? labels.length - 1 - DEFAULT_CHART_RANGE : 0
            },
            updateForDetail() {
                let partitions = details[this.data.key].partitions
                let labels = [], data = []
                for(let i = this.data.rangeBegin; i <= this.data.rangeEnd; ++i) {
                    labels[labels.length] = partitions[i].label
                    data[data.length] = partitions[i][this.data.view]
                }
                if(chartObject == null) {
                    chartObject = new Chart($(`${selectName} #chart`).get(0).getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [{backgroundColor: CHART_VIEW_COLOR[this.data.view], data: data}]
                        },
                        options: {
                            aspectRatio: 3,
                            legend: {display: false},
                            scales: {yAxes: [{ticks: {beginAtZero: true}}]}
                        }
                    })
                }else{
                    chartObject.data.labels = labels
                    chartObject.data.datasets[0].data = data
                    chartObject.data.datasets[0].backgroundColor = CHART_VIEW_COLOR[this.data.view]
                    chartObject.update()
                }
            },
            //辅助函数
            fmtStdDate(date: Date): string {
                /** publish plan是时区相关的时间，需要进行时区处理。*/
                return date ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours() < 10 ? '0' : ''}${date.getHours()}:${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}` : null
            },
        },
        created() {
            this.navigateToSelect()
        }
    })
    $(`${selectName} .ui.dropdown.dropdown-menu`).dropdown({action: 'hide'})
    $(`#timeline-help-modal`).modal({
        centered: false,
        duration: 200,
    })
    function initializeTimePicker() {
        $(`${selectName} #month-begin-time-picker`).calendar({
            type: 'month',
            text: {months: MONTHS, monthsShort: MONTHS},
            formatter: {
                date(date, settings) {
                    if (!date) return null
                    let year  = date.getFullYear()
                    let month = date.getMonth() + 1
                    return `${year}-${month < 10 ? '0' : ''}${month}`
                }
            },
            onChange(date: Date, text: string, mode: string) {
                vm.edit.month.beginTime = date || null
            }
        })
        $(`${selectName} #month-end-time-picker`).calendar({
            type: 'month',
            text: {months: MONTHS, monthsShort: MONTHS},
            formatter: {
                date(date, settings) {
                    if (!date) return null
                    let year  = date.getFullYear()
                    let month = date.getMonth() + 1
                    return `${year}-${month < 10 ? '0' : ''}${month}`
                }
            },
            onChange(date: Date, text: string, mode: string) {
                vm.edit.month.endTime = date || null
            }
        })
        $(`${selectName} #std-begin-time-picker`).calendar({
            type: 'datetime',
            firstDayOfWeek: 1,
            ampm: false,
            formatter: {datetime: formatDateMinuteToStr},
            text: {months: MONTHS, monthsShort: MONTHS},
            onChange(date: Date, text: string) {
                vm.edit.std.beginTime = date || null
            }
        })
        $(`${selectName} #std-end-time-picker`).calendar({
            type: 'datetime',
            firstDayOfWeek: 1,
            ampm: false,
            formatter: {datetime: formatDateMinuteToStr},
            text: {months: MONTHS, monthsShort: MONTHS},
            onChange(date: Date, text: string) {
                vm.edit.std.endTime = date || null
            }
        })
    }

    return vm
}
