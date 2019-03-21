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
            {path: '', method: "redirect", route: 'index/'},
            {path: 'index'},
            {path: 'login'},
            {path: 'register'},
            {path: 'profile'},
            {path: 'database'},
            {path: 'personal/diaries', route: 'diary'},
            {path: 'personal/comments', route: 'comment'},
            {path: 'statistics'},
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
