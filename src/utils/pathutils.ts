import {join, dirname, basename, extname} from 'path'

import type {SupportedLanguage} from './types'

/**
 * Valid language codes
 */
const VALID_LANGUAGES: SupportedLanguage[] = ['en', 'ru', 'es', 'fr']

/**
 * Default language when none is specified
 */
const DEFAULT_LANGUAGE: SupportedLanguage = 'en'

/**
 * Determines the language from a path
 * @param path - File or directory path
 * @returns Language code
 */
export function getLanguageFromPath(path: string): SupportedLanguage {
  if (!path || typeof path !== 'string') {
    console.warn(`Invalid path provided: ${path}`)
    return DEFAULT_LANGUAGE
  }

  const parts = path.replace(/\/+$/, '').split('/').filter(Boolean)

  // Default language for root and single-level paths
  if (parts.length <= 1) return DEFAULT_LANGUAGE

  // Check if second path segment is a valid language code
  const language = parts[1]
  return VALID_LANGUAGES.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : DEFAULT_LANGUAGE
}

/**
 * Determines if a directory name corresponds to a supported language
 * @param path - Directory path
 * @returns Whether the directory is a language directory
 */
export function isLanguageDirectory(path: string): boolean {
  const parts = path.replace(/\/+$/, '').split('/').filter(Boolean)
  const lastPart = parts[parts.length - 1]
  return VALID_LANGUAGES.includes(lastPart as SupportedLanguage)
}

/**
 * Generates a canonical page URL
 * @param language - Language code
 * @param baseFileName - Base filename without extension
 * @param baseUrl - Base site URL
 * @returns Canonical page URL
 */
export function generatePageAddress(
  language: SupportedLanguage,
  baseFileName: string,
  baseUrl: string
): string {
  // Empty baseFileName becomes empty string (for index pages)
  const filename = baseFileName === 'index' ? '' : baseFileName

  return language === DEFAULT_LANGUAGE
    ? `${baseUrl}/${filename}`
    : `${baseUrl}/${language}/${filename}`
}

/**
 * Check if a file is an image based on its extension
 * @param filename - Filename to check
 * @returns Whether the file is an image
 */
export function isImage(filename: string): boolean {
  const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']
  const ext = extname(filename).toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
}

/**
 * Join path segments and normalize
 * @param segments - Path segments to join
 * @returns Joined and normalized path
 */
export function safePath(...segments: string[]): string {
  return join(...segments)
}

/**
 * Get directory name from path
 * @param path - File path
 * @returns Directory name
 */
export function getDir(path: string): string {
  return dirname(path)
}

/**
 * Get base filename without extension
 * @param path - File path
 * @returns Base filename
 */
export function getBaseName(path: string): string {
  return basename(path)
}

/**
 * Get file extension
 * @param path - File path
 * @returns File extension with dot
 */
export function getExtension(path: string): string {
  return extname(path)
}
