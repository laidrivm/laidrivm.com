import {Elysia} from 'elysia'
import {staticPlugin} from '@elysiajs/static'

const dotEnv = await Bun.file('.env')
const key = await Bun.file('certs/key.pem').text()
const cert = await Bun.file('certs/cert.pem').text()

try {
  if (!(await dotEnv.exists())) throw new Error('No .env found')
} catch (error) {
  console.error(error)
}

const app = new Elysia()
  .use(
    staticPlugin({
      prefix: '/',
      assets: 'public',
      indexHTML: true,
      noCache: true //temporary because of https://github.com/elysiajs/elysia/issues/739
    })
  )
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
