import {readdir, mkdir} from 'node:fs/promises'
import {Buffer} from 'node:buffer'

import {isIgnored, ok, err, getFileType} from '../utils.ts'
import type {FileInfo, ServiceResponse, FileMeta} from '../types.ts'

const repoCache = new Map<string, FileInfo>()

async function createDir(fullPath: string): Promise<void> {
  try {
    // Create directory if it doesn't exist
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
    await mkdir(dir, {recursive: true})
  } catch (error) {
    if ((error as any).errno !== -17) {
      console.error(error)
    }
  }
}

/**
 * Stores file in cache
 * @param file - File to cache
 */
export async function storeInCache(
  file: FileInfo
): Promise<ServiceResponse<string>> {
  try {
    const localPath = `${process.env['ARTICLES_DIR']}/${file.sourcePath}`

    // Save file content
    await createDir(localPath)

    // Convert content to string or Buffer for writing
    let contentToWrite: string | Buffer = ''
    if (file.content) {
      if (typeof file.content === 'string' || Buffer.isBuffer(file.content)) {
        contentToWrite = file.content
      } else {
        // For TokensList or JSX.Element, convert to string
        contentToWrite = JSON.stringify(file.content)
      }
    }

    await Bun.write(localPath, contentToWrite)

    // Save metadata with GitHub SHA
    const metadataPath = `${localPath}.meta`
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
    return ok(localPath)
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
export function isCacheValid(path: string, sha: string | null): boolean {
  const cachedFile = repoCache.get(path)
  console.log(`Checking cache validity for ${path}`)
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

      if (isIgnored(fullPath, item.name)) {
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
export async function getFileMeta(filePath: string): Promise<FileMeta | null> {
  const metadataPath = `${filePath}.meta`

  try {
    const metadataFile = Bun.file(metadataPath)
    if (await metadataFile.exists()) {
      const metadata = await metadataFile.json()
      console.log(`Metadata retrieved: ${JSON.stringify(metadata)}`)
      return metadata
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
    const meta = await getFileMeta(filePath)

    if (meta) {
      console.log(`File ${sourcePath} was added to cache`)
      return {
        sourcePath,
        content,
        sha: meta?.sha || null,
        size: meta?.size || stats.size,
        lastModified: new Date(meta?.lastModified),
        type: getFileType(sourcePath)
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
export async function initializeCache(): Promise<ServiceResponse<number>> {
  const articlesDir = process.env['ARTICLES_DIR'] || 'articles'
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
    return err(error as Error)
  }
}
