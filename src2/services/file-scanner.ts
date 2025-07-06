import {readdir, stat} from 'node:fs/promises'
import {join} from 'path'

import {ok, err, isIgnored, getFileType} from '../utils.ts'
import type {ServiceResponse, FileInfo, FileCollection} from '../types.ts'

import {getFileMeta} from './cache.ts'

/**
 * Recursively scans a directory and returns FileInfo objects
 * @param currentPath - Current directory being scanned
 * @param basePath - Base directory path for relative path calculation
 * @returns Array of FileInfo objects
 */
async function scanDirectoryRecursive(
  currentPath: string,
  basePath: string
): Promise<ServiceResponse<FileInfo[]>> {
  const files: FileInfo[] = []

  try {
    const entries = await readdir(currentPath)

    for (const entry of entries) {
      const fullPath = join(currentPath, entry)
      const relativePath = fullPath.replace(basePath, '').replace(/^\//, '')

      if (isIgnored(relativePath, entry)) {
        continue
      }

      try {
        const stats = await stat(fullPath)

        if (stats.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await scanDirectoryRecursive(fullPath, basePath)
          files.push(...subFiles.data)
        } else if (stats.isFile()) {
          const meta = await getFileMeta(fullPath)
          const fileInfo: FileInfo = {
            sourcePath: relativePath,
            localPath: fullPath,
            sha: meta?.sha || null,
            size: meta?.size || stats.size,
            lastModified: (meta && new Date(meta?.lastModified)) || stats.mtime,
            type: getFileType(fullPath)
          }
          files.push(fileInfo)
        }
      } catch (statError) {
        // Skip files that can't be accessed (permissions, etc.)
        console.warn(`Cannot access ${fullPath}:`, statError)
        continue
      }
    }
  } catch (error) {
    console.error(`Failed to read directory ${currentPath}: ${error}`)
    return err(error)
  }

  return ok(files)
}

/**
 * Scans a directory recursively and returns file information
 * @param dirPath - Directory path to scan
 * @returns ServiceResponse with array of FileInfo objects
 */
async function scanLocalContent(dirPath?: string): Promise<FileInfo[]> {
  const articlesDir = dirPath || process.env.ARTICLES_DIR

  if (!articlesDir) {
    return err(new Error('ARTICLES_DIR environment variable is not set'))
  }

  const files = await scanDirectoryRecursive(articlesDir, articlesDir)
  if (!files.success) {
    return files
  }
  return files.data
}

/**
 * Reads file content from GitHub and saves to local filesystem
 * @param githubContent - GitHub repository content response
 * @returns Collection of content files ready for processing
 */
export async function processFilesContent(
  githubContent: ServiceResponse<FileCollection>
): Promise<ServiceResponse<FileCollection>> {
  if (!githubContent.success) {
    return githubContent
  }

  let files = githubContent.data.files
  console.log(`Processing ${files.length} files from repository`)

  switch (githubContent.data.mode) {
    case 'new':
      console.log(`Need to generate only new files, passing them by`)
      break
    case 'local':
    case 'all':
      console.log(`Need to generate all the files, scanning for them`)
      files = await scanLocalContent()
      break
    default:
      return err(new Error('Unknown generation mode'))
  }

  if (files.length > 0) {
    return ok({
      files,
      lastFetch: githubContent.data.lastFetch,
      repoSha: githubContent.data.repoSha,
      mode: githubContent.data.mode
    })
  }
  console.log('No files to process, skipping next steps')
  return ok({
    mode: 'skip'
  })
}
