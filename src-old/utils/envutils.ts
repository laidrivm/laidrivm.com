import type {EnvConfig} from './types'

/**
 * Default environment configuration
 */
const DEFAULT_ENV: EnvConfig = {
  PORT: '3000',
  ADDRESS: 'localhost',
  SOURCE: 'local',
  GITHUB_TOKEN: 'unauth',
  ARTICLES: 'articles',
  PUBLIC: 'public'
}

/**
 * Initialize environment variables with defaults
 * @returns The current environment configuration
 */
export function initDefaults(): EnvConfig {
  const config: EnvConfig = {...DEFAULT_ENV}

  // Set defaults only for missing environment variables
  Object.entries(DEFAULT_ENV).forEach(([key, defaultValue]) => {
    const envVar = key as keyof EnvConfig

    if (!process.env[envVar]) {
      process.env[envVar] = defaultValue
      console.log(`Using default ${key}: ${defaultValue}`)
    }

    config[envVar] = process.env[envVar] as string
  })

  return config
}

/**
 * Get the current environment configuration
 * @returns The current environment configuration
 */
export function getConfig(): EnvConfig {
  return {
    PORT: process.env.PORT || DEFAULT_ENV.PORT,
    ADDRESS: process.env.ADDRESS || DEFAULT_ENV.ADDRESS,
    SOURCE: process.env.SOURCE || DEFAULT_ENV.SOURCE,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || DEFAULT_ENV.GITHUB_TOKEN,
    ARTICLES: process.env.ARTICLES || DEFAULT_ENV.ARTICLES,
    PUBLIC: process.env.PUBLIC || DEFAULT_ENV.PUBLIC,
    REGENERATE_TOKEN: process.env.REGENERATE_TOKEN
  }
}

/**
 * Get canonical base URL from environment
 * @returns The site's base URL
 */
export function getBaseUrl(): string {
  return `https://${process.env.ADDRESS}`
}
