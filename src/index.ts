import {Elysia} from 'elysia'
import {staticPlugin} from '@elysiajs/static'

const key = await Bun.file('certs/key.pem').text()
const cert = await Bun.file('certs/cert.pem').text()

function hasRequiredEnvVars(): boolean {
  const requiredVars = [
    'PORT',
    'ADDRESS',
    'SOURCE',
    'GITHUB_TOKEN',
    'ARTICLES',
    'PUBLIC'
  ]
  return requiredVars.every(varName => !!process.env[varName])
}

try {
  if (!hasRequiredEnvVars()) {
    const dotEnv = await Bun.file('.env')
    if (!(await dotEnv.exists())) {
      throw new Error('No .env file found')
    }
  }
} catch (error) {
  console.error('Site serving initialization error:', error)
  process.exit(1)
}

const app = new Elysia()
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
