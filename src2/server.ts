import {Elysia} from 'elysia'

import {generate} from './services/generator.ts'

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

console.log('Loading certificates...')
const {key, cert} = await loadTlsCertificates()

console.log('Triggering initial site generation...')
const buildResult = await generate()

if (!buildResult.success) {
  console.error('Initial build failed:', buildResult.error)
  process.exit(1)
}
console.log(`Initial build completed`)
console.log(buildResult)

const app = new Elysia()
  .get('/api/v1/health', () => ({
    status: 'ok',
    lastBuild: new Date().toISOString()
  }))
  .post('/api/v1/regenerate', async () => {
    const regenerateResult = await generate()
    if (!regenerateResult.success) {
      return {
        success: false,
        error: regenerateResult.error
      }
    }
    return {
      success: true,
      data: regenerateResult.data
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
