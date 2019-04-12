(function () {
    const $ = window['$']
    const webURL = window['webURL']
    const staticURL = window['staticURL']
    const setTitle = window['setTitle']

    const TAB = {
        'overview': {
            title: '概览',
            viewName: 'overview',
            vueName: 'createOverviewVue'
        },
        'season': {
            title: '季度',
            viewName: 'season',
            vueName: 'createSeasonVue',
        },
        'timeline': {
            title: '时间线',
            viewName: 'timeline',
            vueName: 'createTimelineVue',
        }
    }

    /**
     * 从hash中解析当前处于的面板状态。返回值为tab名称。返回'main'时表示主页面，返回null时表示未知页面。
     */
    function getHash(): string {
        const REGEX = /#?\/?([a-z_\-]*)\/?/
        let hash = window.location.hash
        if(!hash) {
            return 'main'
        }
        let found = hash.match(REGEX)
        if(found) {
            return !found[1] ? 'main' : found[1] in TAB ? found[1] : null
        }
        return null
    }
    /**
     * 切换当前显示的面板.
     */
    function tabView() {
        $('.view-div').css('display', 'none')
        if(location.tab) {
            $(`#${location.tab}.view-div`).show()
        }else{
            $('#not-found.view-div').show()
        }
    }
    /**
     * 获取一个vue模型。这个行为是异步的，因为有可能动态加载新的vue和html组件。
     * @param tabName
     * @param callback
     */
    function getVue(tabName: string, callback: (vue) => void) {
        if(tabName in vms) {
            callback(vms[tabName])
        }else if(window[TAB[tabName].vueName]) {
            let vm = window[TAB[tabName].vueName](`#${tabName}`, location)
            vms[tabName] = vm
            window['vms'][tabName] = vm
            callback(vm)
        }else{
            $(`#${tabName}`).load(`${webURL}/statistics/html/${TAB[tabName].viewName}/`, () => {
                $.getScript(`${staticURL}/js/views/statistics/${TAB[tabName].viewName}.js`, () => {
                    let vm = window[TAB[tabName].vueName](`#${tabName}`, location)
                    vms[tabName] = vm
                    window['vms'][tabName] = vm
                    callback(vm)
                })
            })
        }
    }
    /**
     * hash发生更改时触发事件。
     */
    function hashChanged() {
        let tab = getHash()
        if(tab != location.tab) {
            let oldTab = location.tab
            if(oldTab && oldTab !== 'main') {
                getVue(oldTab, (vue) => {
                    if(typeof vue.leave === 'function') vue.leave()
                })
            }
            location.tab = tab
            if(tab && tab !== 'main') {
                getVue(tab, (vue) => {
                    if(typeof vue.load === 'function') vue.load()
                    tabView()
                })
                setTitle(`${TAB[tab].title} - 统计`)
            }else if(tab === 'main') {
                tabView()
                setTitle('统计')
            }
        }
    }

    let location = {
        tab: undefined
    }
    let vms = {}

    hashChanged()
    window.onhashchange = hashChanged
})()