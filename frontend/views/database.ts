(function () {
    //全局资源区
    const $ = window['$']
    const webURL = window['webURL']
    const staticURL = window['staticURL']
    //DATABASE vue 创建函数的名字
    const createVue = {
        'animation-list': 'createAnimationListVue',
        'animation-new': 'createAnimationNewVue',
        'animation-detail': 'createAnimationDetailVue',
        'tag-list': 'createTagListVue',
        'tag-new': 'createTagNewVue',
        'tag-detail': 'createTagDetailVue',
        'staff-list': 'createStaffListVue',
        'staff-new': 'createStaffNewVue',
        'staff-detail': 'createStaffDetailVue'
    }
    /**
     * 从hash中解析当前处于的面板状态。
     * 面板状态遵循如下的编码规则。
     * #/animations/    列表。前后斜线都可省略
     * #/animations/1/  带有页码的列表。前后斜线都可省略
     * #/animations/detail/1/   详情页。前后斜线都可省略
     * #/animations/new/        新建页。前后斜线都可省略
     */
    function getHash(): {mode: 'detail' | 'list' | 'new' | 'edit', tab: string, id?: number | string, params?: Object | null} {
        const LIST_REGEX = /#?\/?([a-z]+)\/?(\?.*)?/
        const DETAIL_REGEX = /#?\/?([a-z]+)\/detail\/([^\/]+)\/?(\?.*)?/
        const EDIT_REGEX = /#?\/?([a-z]+)\/edit\/([^\/]+)\/?(\?.*)?/
        const NEW_REGEX = /#?\/?([a-z]+)\/new\/?(\?.*)?/
        function generateParameters(str: string) {
            if(str) {
                if(str.startsWith('?')) str = str.substring(1)
                let list = str.split('&')
                let ret = {}
                for(let item of list) {
                    let eqIndex = item.indexOf('=')
                    if(eqIndex >= 0) {
                        let key = item.substring(0, eqIndex), value = item.substring(eqIndex + 1) || null
                        key = decodeURIComponent(key)
                        value = decodeURIComponent(value)
                        if(key in ret) {
                            let existValue = ret[key]
                            if(typeof existValue === 'object') existValue[existValue.length] = value
                            else ret[key] = [existValue, value]
                        }else{
                            ret[key] = value
                        }
                    }else{
                        ret[item] = null
                    }
                }
                return ret
            }else{
                return null
            }
        }
        let hash = window.location.hash
        if(!hash) {
            return {mode: 'list', tab: 'animations'}
        }
        let found = hash.match(DETAIL_REGEX)
        if(found) {
            return {
                mode: 'detail',
                tab: found[1],
                id: decodeURIComponent(found[2]),
                params: generateParameters(found[3])
            }
        }
        found = hash.match(EDIT_REGEX)
        if(found) {
            return {
                mode: 'edit',
                tab: found[1],
                id: decodeURIComponent(found[2]),
                params: generateParameters(found[3])
            }
        }
        found = hash.match(NEW_REGEX)
        if(found) {
            return {
                mode: 'new',
                tab: found[1],
                params: generateParameters(found[2])
            }
        }
        found = hash.match(LIST_REGEX)
        if(found) {
            return {
                mode: 'list',
                tab: found[1],
                params: generateParameters(found[2])
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
        if(stdTab === 'animation' && mode === 'edit') {
            return 'animation-new'
        }else if(stdTab === 'tag' && mode === 'edit') {
            return 'tag-detail'
        }else if(stdTab === 'staff' && mode === 'edit') {
            return 'staff-detail'
        }else{
            return stdTab && mode ? `${stdTab}-${mode}` : null
        }
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
     * 获取一个vue模型。这个行为是异步的，因为有可能动态加载新的vue和html组件。
     * @param viewName
     * @param callback
     */
    function getVue(viewName: string, callback: (vue) => void) {
        if(viewName in vms) {
            callback(vms[viewName])
        }else if(window[createVue[viewName]]) {
            let vm = window[createVue[viewName]](`#${viewName}`, location)
            vms[viewName] = vm
            window['vms'][viewName] = vm
            callback(vm)
        }else{
            $(`#main #${viewName}`).load(`${webURL}/database/html/${viewName}/`, () => {
                $.getScript(`${staticURL}/js/views/database/${viewName}.js`, () => {
                    let vm = window[createVue[viewName]](`#${viewName}`, location)
                    vms[viewName] = vm
                    window['vms'][viewName] = vm
                    callback(vm)
                })
            })
        }
    }
    /**
     * hash发生更改时触发事件。
     */
    function hashChanged() {
        let {mode, tab, id, params} = getHash()
        if(tab != location.tab || id != location.id || mode != location.mode) {
            let oldViewName = getViewName(location.tab, location.mode)
            let newViewName = getViewName(tab, mode)
            if(oldViewName != newViewName) {
                if(oldViewName) {
                    getVue(oldViewName, (vue) => {
                        if(typeof vue.leave === 'function') vue.leave()
                    })
                }
                location.mode = mode
                location.tab = tab
                location.id = id
                location.params = params
                if(newViewName) {
                    getVue(newViewName, (vue) => {
                        if(typeof vue.load === 'function') vue.load(tempPrivateParams)
                        tempPrivateParams = null
                        tabView()
                    })
                }
            }else{
                location.mode = mode
                location.tab = tab
                location.id = id
                location.params = params
                if(newViewName) {
                    getVue(newViewName, (vue) => {
                        if(typeof vue.refresh === 'function') vue.refresh(tempPrivateParams)
                        tempPrivateParams = null
                        tabView()
                    })
                }
            }
        }
    }
    let tempPrivateParams = null
    //本地公共资源区
    let location = {
        mode: null,
        tab: null,
        id: undefined,
        params: undefined,
        route(hash: string, params?: Object) {
            tempPrivateParams = params || null
            window.location.hash = hash
        }
    }
    let vms = {}

    hashChanged()
    window.onhashchange = hashChanged

})()