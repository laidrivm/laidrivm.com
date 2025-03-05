import {join} from 'path'
/**
 * Determines the language of a given path
 */
export function getLanguageFromPath(path: string): SupportedLanguage {
  if (!path || typeof path !== 'string') {
    console.warn(`Invalid path provided: ${path}`)
    return 'en'
  }

  const validLanguages: SupportedLanguage[] = ['en', 'ru', 'es', 'fr']
  const parts = path.replace(/\/+$/, '').split('/').filter(Boolean)

  if (parts.length <= 1) return 'en'

  const language = parts[1]
  return validLanguages.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : 'en'
}

/**
 * Generates a canonical page address
 */
export function generatePageAddress(
  language: SupportedLanguage,
  baseFileName: string
): string {
  const baseUrl = `https://${process.env.ADDRESS}`
  return language === 'en'
    ? `${baseUrl}/${baseFileName}/`
    : `${baseUrl}/${language}/${baseFileName}/`
}

/**
 * Resolves output paths for a markdown file
 */
export function resolveOutputPaths(
  articlesPath: string,
  publicPath: string,
  file: string
) {
  const isIndexMd = file === 'index.md'

  if (isIndexMd) {
    return {
      outputDir: publicPath,
      outputFileName: 'index.html',
      isIndexMd: true
    }
  }

  const baseFileName = file.replace('.md', '')
  return {
    outputDir: join(publicPath, baseFileName),
    outputFileName: 'index.html',
    isIndexMd: false
  }
}
