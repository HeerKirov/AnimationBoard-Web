(function () {
    //全局资源区
    const $ = window['$']
    const Vue = window['Vue']
    const client = window['client']
    const webURL = window['webURL']
    //DATABASE vue 创建函数
    const createVue = {
        'animation-list': window['createAnimationListVue'],
        'animation-new': window['createAnimationNewVue'],
        'animation-detail': window['createAnimationDetailVue'],
    }
    /**
     * 从hash中解析当前处于的面板状态。
     * 面板状态遵循如下的编码规则。
     * #/animations/    列表。前后斜线都可省略
     * #/animations/1/  带有页码的列表。前后斜线都可省略
     * #/animations/detail/1/   详情页。前后斜线都可省略
     * #/animations/new/        新建页。前后斜线都可省略
     */
    function getHash(): {mode: 'detail' | 'list' | 'new', tab: string, id?: number | string} {
        const LIST_REGEX = /#?\/?([a-z]+)\/?/
        const DETAIL_REGEX = /#?\/?([a-z]+)\/detail\/([^\/]+)\/?/
        const NEW_REGEX = /#?\/?([a-z]+)\/new\/?/
        let hash = window.location.hash
        if(!hash) {
            return {mode: 'list', tab: 'animations'}
        }
        let found = hash.match(DETAIL_REGEX)
        if(found) {
            return {
                mode: 'detail',
                tab: found[1],
                id: decodeURIComponent(found[2])
            }
        }
        found = hash.match(NEW_REGEX)
        if(found) {
            return {
                mode: 'new',
                tab: found[1]
            }
        }
        found = hash.match(LIST_REGEX)
        if(found) {
            return {
                mode: 'list',
                tab: found[1]
            }
        }
        return {mode: 'list', tab: 'animations'}
    }
    /**
     * 从url hash中的tab和mode推断出适合的view name。
     * @param tab
     * @param mode
     */
    function getViewName(tab: string, mode: string): string {
        let stdTab = tab === 'animations' ? 'animation' :
                tab === 'tags' ? 'tag' :
                tab === 'staffs' ? 'staff' : null
        return stdTab && mode ? `${stdTab}-${mode}` : null
    }
    /**
     * 切换当前显示的面板.
     */
    function tabView() {
        $('.view-div').css('display', 'none')
        let viewName = getViewName(location.tab, location.mode)
        if(viewName) {
            $(`#${viewName}.view-div`).show()
        }else{
            $('#not-found.view-div').show()
        }
    }
    /**
     * hash发生更改时触发事件。
     */
    function hashChanged() {
        let {mode, tab, id} = getHash()
        if(tab != location.tab || id != location.id || mode != location.mode) {
            let oldViewName = getViewName(location.tab, location.mode)
            let newViewName = getViewName(tab, mode)
            if(oldViewName != newViewName) {
                if(oldViewName && oldViewName in vms) {
                    let leave = vms[oldViewName].leave
                    if(typeof leave === 'function') leave()
                }
                location.mode = mode
                location.tab = tab
                location.id = id
                if(newViewName && newViewName in vms) {
                    let load = vms[newViewName].load
                    if(typeof load === 'function') load()
                }
            }else{
                location.mode = mode
                location.tab = tab
                location.id = id
                if(newViewName && newViewName in vms) {
                    let refresh = vms[newViewName].refresh
                    if(typeof refresh === 'function') refresh()
                }
            }
            tabView()
        }
    }
    //本地公共资源区
    let location = {
        mode: null,
        tab: null,
        id: undefined
    }
    let vms = {}

    //初始化逻辑
    for(let name in createVue) {
        let func = createVue[name]
        if(typeof func === 'function') {
            let vue = func(`#${name}`, location)
            vms[name] = vue
            window['vms'][name] = vue
        }
    }
    hashChanged()
    window.onhashchange = hashChanged

    //semantic ui初始化区
    $('#main .ui.dropdown.dropdown-menu').dropdown({action: 'hide'})
    $('#main .ui.dropdown.dropdown-select').dropdown({fullTextSearch: true})
    $('#main .accordion').accordion()

})()