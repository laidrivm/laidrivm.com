import {Elysia} from 'elysia'
import {staticPlugin} from '@elysiajs/static'

import * as EnvUtils from './envutils.ts'
import {regenerate} from './regenerate.ts'

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
  .post('/regenerate', async ({headers, set}) => {
    const authHeader = headers.authorization

    // Check if Authorization header is present and in the expected format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return {
        success: false,
        message: 'Unauthorized: Authorization header missing or invalid format'
      }
    }

    const token = authHeader.split(' ')[1]

    if (token !== process.env.REGENERATE_TOKEN) {
      set.status = 401
      return {
        success: false,
        message: 'Unauthorized: Invalid token'
      }
    }

    try {
      regenerate()
      set.status = 200
      return 'Ok'
    } catch (error) {
      set.status = 500
      return {
        success: false,
        message: `Regeneration failed: ${error.message}`
      }
    }
  })
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
