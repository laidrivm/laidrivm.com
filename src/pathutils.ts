import {join, extname, dirname, resolve} from 'path'

import type {SupportedLanguage, Index} from './types'

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
    ? `${baseUrl}/${baseFileName}`
    : `${baseUrl}/${language}/${baseFileName}`
}

/**
 * Resolves output paths for a markdown file
 */
export function resolveOutputPaths(
  articlesPath: string,
  publicPath: string,
  file: string
): Index {
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

export function isLanguageDirectory(path: string): boolean {
  const validLanguages: SupportedLanguage[] = ['en', 'ru', 'es', 'fr']
  const parts = path.replace(/\/+$/, '').split('/').filter(Boolean)

  const candidate = parts[parts.length - 1]
  return validLanguages.includes(candidate as SupportedLanguage)
}

/**
 * Check if a file is an image based on its extension
 * @param filename Filename to check
 * @returns Boolean indicating if file is an image
 */
export function isImage(filename: string): boolean {
  const IMAGE_EXTENSIONS: string[] = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp'
  ]
  const ext = extname(filename).toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
}

/**
 * Get the directory name of a path
 * @param filePath Path to extract directory from
 * @returns Directory part of the path
 */
export function getDirname(filePath: string): string {
  return dirname(filePath)
}

/**
 * Resolve a path from current working directory
 * @param paths Path segments to resolve
 * @returns Resolved absolute path
 */
export function resolvePath(...paths: string[]): string {
  return resolve(...paths)
}

export {join}
