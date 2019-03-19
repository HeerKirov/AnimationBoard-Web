const TOKEN_NAME: string = 'client-token'

class Client {
    private readonly serverURL: string
    private instance
    private token: string

    constructor(params: {serverURL: string}) {
        this.serverURL = params.serverURL + '/api'
        this.instance = window['axios'].create()
        if(window.localStorage[TOKEN_NAME]) {
            this.token = window.localStorage[TOKEN_NAME]
        }
        this.generate()
    }

    private getURL(url: string): string {
        return `${this.serverURL}${url}/`
    }
    private getDetailURL(url: string, id: any): string {
        return `${this.serverURL}${url}/${id}/`
    }
    private getHeaders(contentType?: string): {} {
        let ret: any = {}
        if(this.token) ret['Authorization'] = `Token ${this.token}`
        if(contentType) ret['Content-Type'] = contentType
        return this.token || contentType ? ret : null
    }

    private static callbackSuccess(callback: (success: boolean, status: number, data: any) => void, response: any): void {
        callback(true, response.status, response.data)
    }
    private static callbackFailed(callback: (success: boolean, status: number, data: any) => void, error: any): void {
        if(error.response) {
            callback(false, error.response.status, error.response.data)
        }else{
            callback(false, null, null)
        }
    }
    private generateMethod(method: string, url: string) {
        return {
            list: (url: string) => (params, callback) =>
                this.instance.get(this.getURL(url), {params, headers: this.getHeaders()})
                    .then((response) => Client.callbackSuccess(callback, response))
                    .catch((error) => Client.callbackFailed(callback, error)),
            create: (url: string) => (content, callback) =>
                this.instance.post(this.getURL(url), content, {headers: this.getHeaders()})
                    .then((response) => Client.callbackSuccess(callback, response))
                    .catch((error) => Client.callbackFailed(callback, error)),
            retrieve: (url: string) => (id, callback) =>
                this.instance.get(this.getDetailURL(url, id), {headers: this.getHeaders()})
                    .then((response) => Client.callbackSuccess(callback, response))
                    .catch((error) => Client.callbackFailed(callback, error)),
            update: (url: string) => (id, content, callback) =>
                this.instance.put(this.getDetailURL(url, id), content, {headers: this.getHeaders()})
                    .then((response) => Client.callbackSuccess(callback, response))
                    .catch((error) => Client.callbackFailed(callback, error)),
            partialUpdate: (url: string) => (id, content, callback) =>
                this.instance.patch(this.getDetailURL(url, id), content, {headers: this.getHeaders()})
                    .then((response) => Client.callbackSuccess(callback, response))
                    .catch((error) => Client.callbackFailed(callback, error)),
            delete: (url: string) => (id, callback) =>
                this.instance.delete(this.getDetailURL(url, id), {headers: this.getHeaders()})
                    .then((response) => Client.callbackSuccess(callback, response))
                    .catch((error) => Client.callbackFailed(callback, error)),
            get: (url: string) => (callback) =>
                this.instance.get(this.getURL(url), {headers: this.getHeaders()})
                    .then((response) => Client.callbackSuccess(callback, response))
                    .catch((error) => Client.callbackFailed(callback, error)),
            post: (url: string) => (content, callback) =>
                this.instance.post(this.getURL(url), content, {headers: this.getHeaders()})
                    .then((response) => Client.callbackSuccess(callback, response))
                    .catch((error) => Client.callbackFailed(callback, error)),
            put: (url: string) => (content, callback) =>
                this.instance.put(this.getURL(url), content, {headers: this.getHeaders()})
                    .then((response) => Client.callbackSuccess(callback, response))
                    .catch((error) => Client.callbackFailed(callback, error)),
            patch: (url) => (content, callback) =>
                this.instance.patch(this.getURL(url), content, {headers: this.getHeaders()})
                    .then((response) => Client.callbackSuccess(callback, response))
                    .catch((error) => Client.callbackFailed(callback, error))
        }[method](url)
    }
    private endpoint(url: string, includes?: string[], extra_action?: {}): Object {
        includes = includes || ['list', 'create', 'retrieve', 'update', 'partialUpdate', 'delete']
        let ret = {}
        if(extra_action) {
            for(let key in extra_action) {
                ret[key] = extra_action[key]
            }
        }
        for(let i of includes) {
            ret[i] = this.generateMethod(i, url)
        }
        return ret
    }
    private generatePostFormData(url: (params) => string) {
        return (params, formData, callback) => {
            this.instance.post(this.getURL(url(params)), formData, {headers: this.getHeaders("multipart/form-data")})
                .then((response) => Client.callbackSuccess(callback, response))
                .catch((error) => Client.callbackFailed(callback, error))
        }
    }
    private generate() {
        this['cover'] = {
            animation: this.generatePostFormData((params) => `/cover/animation/${params}`)
        }
        this['user'] = {
            login: this.endpoint('/user/login', ['post']),
            logout: this.endpoint('/user/logout', ['post']),
            token: this.endpoint('/user/token', ['post']),
            register: this.endpoint('/user/register', ['post'])
        }
        this['profile'] = {
            info: this.endpoint('/profile/info', ['get', 'retrieve', 'update', 'partialUpdate']),
            password: this.endpoint('/profile/password', ['update']),
            messages: this.endpoint('/profile/messages', ['list', 'retrieve', 'update'], {
                'unreadCount': this.endpoint('/profile/messages/unread_count', ['get'])
            })
        }
        this['database'] = {
            animations: this.endpoint('/database/animations'),
            staffs: this.endpoint('/database/staffs'),
            tags: this.endpoint('/database/tags')
        }
        this['personal'] = {
            diaries: this.endpoint('/personal/diaries'),
            comments: this.endpoint('/personal/comments')
        }
        this['admin'] = {
            setting: this.endpoint('/admin/setting', ['get', 'post']),
            users: this.endpoint('/admin/users', ['list', 'retrieve', 'update', 'partialUpdate']),
            userPasswords: this.endpoint('/admin/users-password', ['update']),
            registrationCode: this.endpoint('/admin/registration-code', ['create', 'list', 'retrieve']),
            systemMessages: this.endpoint('/admin/system-messages', ['list', 'create', 'retrieve'])
        }
    }

    setToken(token: string): void {
        this.token = token
        if(token) {
            window.localStorage[TOKEN_NAME] = token
        }else if(window.localStorage[TOKEN_NAME]) {
            window.localStorage.removeItem(TOKEN_NAME)
        }
    }
}