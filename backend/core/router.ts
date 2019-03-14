import * as express from 'express'

class Router {
    private router = express.Router()
    private publicParams: {} = {}
    private internalParamsFunction = {
        selfLocation: {}
    }

    constructor(private app: express.Application, private rootPath: string = '') {}

    route(conf: RouterConfiguration): this {
        for(let router of conf.routers) {
            if(router.method === 'redirect') {
                this.router.get(`/${router.path}`, (req, res) => {
                    res.redirect(router.route)
                })
            }else{
                this.router.get(`/${router.path}`, (req, res) => {
                    let params = this.generateParams({
                        route: router.route || router.path, customParams: router.params
                    })
                    res.render(router.route || router.path, params)
                })
            }
        }
        this.app.use(`${this.rootPath}${conf.path || ''}`, this.router)
        return this
    }

    raise(statusCode: number, route: string, params?: {}): this {
        this.router.get('*', (req, res) => {
            res.status(statusCode)
            res.render(route, this.generateParams({customParams: params, route: 'not_found'}))
        })
        return this
    }

    params(params: {}): this {
        this.publicParams = params
        return this
    }

    getInternalParamsFunction(name: string): any {
        return this.internalParamsFunction[name]
    }

    private generateParams(params?: {route?: string, customParams?: {}}): {} {
        let ret = {}
        let analyse = (key: string, value: any) => {
            if(value === this.internalParamsFunction.selfLocation) {
                ret[key] = params && params.route ? params.route : null
            }else if(typeof value === 'function') {
                ret[key] = value(this.publicParams)
            }else{
                ret[key] = value
            }
        }

        for(let key in this.publicParams) {
            analyse(key, this.publicParams[key])
        }
        if(params && params.customParams) {
            for(let key in params.customParams) {
                analyse(key, params.customParams[key])
            }
        }
        return ret
    }
}

interface RouterConfiguration {
    path?: string,
    routers: Array<{
        path: string,
        method?: 'render' | 'redirect',
        route?: string,
        params?: Object
    }>
}

export {Router}