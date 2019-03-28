import * as createError from 'http-errors'
import * as express from 'express'
import * as path from 'path'
import * as cookieParser from 'cookie-parser'
import * as logger from 'morgan'

import {Router} from './router'
import * as config from '../../config'

let app = express()

// view engine setup
app.set('views', path.join(__dirname, '../../views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(`/${config.prefix}static`, express.static(path.join(__dirname, '../../public')))

let router = new Router(app, `/${config.prefix}web`);
router.route({
        path: '',
        routers: [
            {path: '', method: "redirect", route: `/${config.prefix}web/index/`},
            {path: 'index'},
            {path: 'login'},
            {path: 'register'},
            {path: 'profile'},
            {path: 'database/html/animation-list', route: 'database/animation-list'},
            {path: 'database/html/animation-new', route: 'database/animation-new'},
            {path: 'database/html/animation-detail', route: 'database/animation-detail'},
            {path: 'database/html/staff-list', route: 'database/staff-list'},
            {path: 'database/html/staff-new', route: 'database/staff-new'},
            {path: 'database/html/staff-detail', route: 'database/staff-detail'},
            {path: 'database/html/tag-list', route: 'database/tag-list'},
            {path: 'database/html/tag-new', route: 'database/tag-new'},
            {path: 'database/html/tag-detail', route: 'database/tag-detail'},
            {path: 'database'},
            {path: 'personal/diaries', route: 'diary'},
            {path: 'personal/comments', route: 'comment'},
            {path: 'statistics'},
            {path: 'admin', method: "redirect", route: `/${config.prefix}web/admin/setting/`},
            {path: 'admin/setting', route: 'admin/setting'},
            {path: 'admin/users', route: 'admin/user'},
            {path: 'admin/registration-code', route: 'admin/code'},
            {path: 'admin/system-messages', route: 'admin/message'},
        ]
    })
    .raise(404, 'not_found')
    .params({
        title: 'Animation Board',
        prefix: config.prefix,
        serverURL: config.serverURL,
        staticURL: `/${config.prefix}static`,
        webURL: `/${config.prefix}web`,
        selfLocation: router.getInternalParamsFunction('selfLocation')
    })



export {app}
