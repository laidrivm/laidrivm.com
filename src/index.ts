import {Elysia} from 'elysia'
import {staticPlugin} from '@elysiajs/static'

import * as EnvUtils from './envutils.ts'

const key = await Bun.file('certs/key.pem').text()
const cert = await Bun.file('certs/cert.pem').text()

EnvUtils.initDefaults()

const app = new Elysia()
  .onRequest(({path, redirect}) => {
    if (path.includes('.html')) {
      return redirect(path.replace('.html', ''), 302)
    }
  })
  .use(
    staticPlugin({
      prefix: '/',
      assets: process.env.PUBLIC,
      indexHTML: true,
      noCache: true //temporary because of https://github.com/elysiajs/elysia/issues/739
    })
  )
  .route('HEAD', '/', '')
  .onError(({code}) => {
    if (code === 'NOT_FOUND') {
      return 'Route not found :('
    }
  })
  .listen({
    port: process.env.PORT,
    tls: {
      key,
      cert
    }
  })

console.log(
  `Elysia is running at ${app.server?.hostname}:${app.server?.port} on Bun ${Bun.version} for ${Bun.nanoseconds() / 1000000000} seconds`
)
