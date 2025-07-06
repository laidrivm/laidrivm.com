import {extname} from 'path'

import type {ServiceResult, FileType} from './types.ts'

/**
 * List of files to ignore when processing repositories
 */
export const IGNORE_LIST = [
  'README.md',
  '.git',
  '.gitignore',
  'LICENSE',
  '.github',
  '.meta',
  'node_modules',
  '.DS_Store'
]

/**
 * Check if a path should be ignored
 * @param path - File path
 * @param name - File name
 * @returns Whether the path should be ignored
 */
export function isIgnored(path: string, name: string): boolean {
  return (
    IGNORE_LIST.includes(name) ||
    IGNORE_LIST.some(ignored => path.includes(ignored))
  )
}

/**
 * Determines if file is a supported content type
 * @param path - File path
 * @returns Content file type
 */
export function getFileType(path: string): FileType {
  const extension = extname(path).toLowerCase()

  switch (extension) {
    case '.md':
    case '.markdown':
      return 'markdown'
    default:
      return 'unsupported'
  }
}

export function asyncPipe<T>(...functions: Function[]): ServiceResult {
  return async (initialValue: T) => {
    let currentValue = initialValue
    for (const currentFunction of functions) {
      currentValue = await currentFunction(currentValue)
      if (!currentValue.success) {
        return currentValue
      }
    }
    return currentValue
  }
}

/**
 * Creates a successful result
 * @param data - The success data
 * @returns Success result
 */
export function ok<T>(data: T): ServiceResult<T> {
  return {
    success: true,
    data
  }
}

/**
 * Creates an error result
 * @param error - The error
 * @returns Error result
 */
export function err<E extends Error>(error: E): ServiceResult<never, E> {
  return {
    success: false,
    error
  }
}
