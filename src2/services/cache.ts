import {readdir, mkdir} from 'node:fs/promises'

import {isIgnored, ok, err} from '../utils.ts'
import type {FileInfo, ServiceResult} from '../types.ts'

const repoCache = new Map<string, FileInfo>()

async function createDir(fullPath) {
  try {
    // Create directory if it doesn't exist
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
    await mkdir(dir)
  } catch (error) {
    if (error.errno !== -17) {
      console.log(error)
    }
  }
}

/**
 * Stores file in cache
 * @param file - File to cache
 */
export async function storeInCache(file: FileInfo): Promise<void> {
  try {
    const fullPath = `${process.env.ARTICLES_DIR}/${file.sourcePath}`

    // Save file content
    await createDir(fullPath)
    await Bun.write(fullPath, file.content)

    // Save metadata with GitHub SHA
    const metadataPath = `${fullPath}.meta`
    const metadata = {
      sha: file.sha,
      size: file.size,
      lastModified: file.lastModified
    }
    await Bun.write(metadataPath, JSON.stringify(metadata, null, 2))
    console.log(
      `Saved file ${file.sourcePath} and it's metadata ${metadataPath} to local directory`
    )

    repoCache.set(file.sourcePath, file)
    console.log(`Cached file ${file.sourcePath} with SHA ${file.sha}`)
    return ok(fullPath)
  } catch (error) {
    console.error(`Failed to save file ${file.sourcePath}:`, error)
    return err(error instanceof Error ? error : new Error('Unknown error'))
  }
}

/**
 * Checks if cached content is still valid
 * @param cacheEntry - Cache entry to check
 * @param currentSha - Current repository SHA
 * @returns Whether cache is valid
 */
export function isCacheValid(path: string, sha: string): boolean {
  const cachedFile = repoCache.get(path)
  console.log(`Checking cache valifity for ${path}`)
  console.log(`SHA: ${sha}`)
  console.log(`Cached SHA: ${cachedFile?.sha}`)
  if (cachedFile) {
    return sha === cachedFile.sha
  }
  return false
}

/**
 * Invalidates cache for a repository
 * @param owner - Repository owner
 * @param repo - Repository name
 */
export function invalidateCache(path: string): void {
  if (repoCache.has(path)) {
    repoCache.delete(path)
    console.log(`Invalidated cache for ${path}`)
  }
}

/**
 * Recursively scans directory for files to cache
 * @param dirPath - Directory path to scan
 * @param allFiles - Accumulator for found files
 * @returns Array of file paths found
 */
async function scanDirectoryRecursive(
  dirPath: string,
  allFiles: string[] = []
): Promise<string[]> {
  try {
    const items = await readdir(dirPath, {withFileTypes: true})

    for (const item of items) {
      const fullPath = `${dirPath}/${item.name}`

      if (isIgnored(fullPath)) {
        continue
      }

      if (item.isDirectory()) {
        await scanDirectoryRecursive(fullPath, allFiles)
      } else if (item.isFile()) {
        allFiles.push(fullPath)
      }
    }

    return allFiles
  } catch (error) {
    console.error(`Failed to scan directory ${dirPath}:`, error)
    return allFiles
  }
}

/**
 * Reads GitHub SHA from metadata file
 * @param filePath - Path to the main file
 * @param content - File content for fallback SHA calculation
 * @returns GitHub SHA or null
 */
async function getFileGitHubSha(filePath: string): Promise<string | null> {
  const metadataPath = `${filePath}.meta`
  console.log(`Trying to get metadata from ${metadataPath}`)

  try {
    const metadataFile = Bun.file(metadataPath)
    if (await metadataFile.exists()) {
      const metadata = await metadataFile.json()
      if (metadata.sha) {
        return metadata.sha
      }
    }
  } catch (error) {
    console.warn(`Failed to read metadata for ${filePath}:`, error)
  }

  return null
}

/**
 * Processes a single file for caching
 * @param filePath - Path to file
 * @param articlesDir - Base articles directory
 * @returns FileInfo or null if processing failed
 */
async function processFileForCache(
  filePath: string,
  articlesDir: string
): Promise<FileInfo | null> {
  try {
    const file = Bun.file(filePath)

    const content = await file.text()
    const stats = await file.stat()

    // Calculate relative path from articles directory
    const sourcePath = filePath.replace(articlesDir, '').replace(/^\//, '')

    // Get GitHub SHA from metadata
    const sha = await getFileGitHubSha(filePath)

    if (sha) {
      console.log(`File ${sourcePath} was added to cache`)
      return {
        sourcePath,
        content,
        sha,
        size: stats.size,
        lastModified: stats.mtime,
        type: 'file'
      }
    } else {
      console.log(`File ${sourcePath} skipped for cache: no GitHub SHA`)
      return null
    }
  } catch (error) {
    console.error(`Failed to process file ${filePath}:`, error)
    return null
  }
}

/**
 * Initializes cache from local articles directory
 * @param articlesDir - Directory containing articles
 * @returns Result of cache initialization
 */
export async function initializeCache(): Promise<ServiceResult<number>> {
  const articlesDir = process.env.ARTICLES_DIR
  console.log(`Initializing cache from local directory: ${articlesDir}`)

  try {
    const filePaths = await scanDirectoryRecursive(articlesDir)
    console.log(`Found ${filePaths.length} files to process`)

    let cachedCount = 0

    for (const filePath of filePaths) {
      const file = await processFileForCache(filePath, articlesDir)
      if (file) {
        repoCache.set(file.sourcePath, file)
        cachedCount++
      }
    }

    console.log(`Successfully cached ${cachedCount} files from local directory`)
    return ok(cachedCount)
  } catch (error) {
    console.error(`Failed to initialize cache from local directory:`, error)
    return err(error)
  }
}
