import {Elysia} from 'elysia'

import packageJson from '../package.json'

import {initializeCache} from './services/cache.ts'
import {generate} from './services/generator.ts'

process.env.VERSION = process.env.VERSION || packageJson.version

console.log(`Server version: ${process.env.VERSION}`)

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

console.log('Initializing cache from local files...')
await initializeCache()

console.log('Triggering initial site generation...')
const buildResult = await generate('all')

if (!buildResult.success) {
  console.error('Initial build failed:', buildResult.error)
  process.exit(1)
}
console.log(`Initial build completed`)

const app = new Elysia()
  .get('/api/v1/health', () => ({
    status: 'ok'
  }))
  .post('/api/v1/regenerate', async () => {
    const regenerateResult = await generate('new')
    return regenerateResult
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
