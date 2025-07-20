import {Elysia} from 'elysia'
import {staticPlugin} from '@elysiajs/static'

import * as EnvUtils from './utils/envutils.ts'
import {regenerate} from './regenerate.ts'

/**
 * Loads TLS certificates for secure server
 * @returns Object containing key and cert for TLS
 */
async function loadTlsCertificates(): Promise<{key: string; cert: string}> {
  try {
    const key = await Bun.file('certs/key.pem').text()
    const cert = await Bun.file('certs/cert.pem').text()
    return {key, cert}
  } catch (error) {
    console.error('Error loading TLS certificates:', error)
    throw new Error('Failed to load TLS certificates')
  }
}

/**
 * Validates authorization token for regeneration endpoint
 * @param authHeader - Authorization header from request
 * @returns Whether the token is valid
 */
function validateAuthToken(authHeader: string | undefined): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.split(' ')[1]
  return token === process.env.REGENERATE_TOKEN
}

// Initialize environment variables
EnvUtils.initDefaults()
const config = EnvUtils.getConfig()

// Load TLS certificates
const {key, cert} = await loadTlsCertificates()

// Handle .html extension redirects
const redirectHTML = new Elysia().onRequest(({path, redirect}) => {
  if (path.includes('.html')) {
    return redirect(path.replace('.html', ''), 302)
  }
})

// Regeneration endpoint with authentication
const postRegenerate = new Elysia().post(
  '/regenerate',
  async ({headers, set}) => {
    if (!validateAuthToken(headers.authorization)) {
      set.status = 401
      return {
        success: false,
        message: 'Unauthorized: Invalid or missing token'
      }
    }

    try {
      await regenerate()
      set.status = 200
      return 'Ok'
    } catch (error) {
      set.status = 500
      return {
        success: false,
        message: `Regeneration failed: ${error.message}`
      }
    }
  }
)

// Create and configure Elysia app
const app = new Elysia()
  .use(redirectHTML)
  .use(
    staticPlugin({
      prefix: '/',
      assets: config.PUBLIC,
      indexHTML: true,
      noCache: true // temporary because of https://github.com/elysiajs/elysia/issues/739
    })
  )
  .route('HEAD', '/', '')
  .use(postRegenerate)
  .onError(({code}) => {
    if (code === 'NOT_FOUND') {
      return 'Route not found :('
    }
  })
  .listen({
    port: Number(config.PORT),
    tls: {
      key,
      cert
    }
  })

console.log(
  `Elysia is running at ${app.server?.hostname}:${app.server?.port} on Bun ${Bun.version} for ${Bun.nanoseconds() / 1000000000} seconds`
)
