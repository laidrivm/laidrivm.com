import {readdir, stat} from 'node:fs/promises'
import {join} from 'path'

import {ok, err, isIgnored, getFileType, isIndex} from '../utils.ts'
import type {
  ServiceResponse,
  FileInfo,
  FileCollection,
  ArticleLink
} from '../types.ts'

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
          if (subFiles.success && subFiles.data) {
            files.push(...subFiles.data)
          }
        } else if (stats.isFile()) {
          const file = Bun.file(fullPath)
          const content = await file.text()
          const meta = await getFileMeta(fullPath)
          const fileInfo: FileInfo = {
            sourcePath: relativePath,
            localPath: fullPath,
            content,
            sha: meta?.sha || null,
            size: meta?.size || stats.size,
            lastModified: (meta && new Date(meta.lastModified)) || stats.mtime,
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
    return err(error as Error)
  }

  return ok(files)
}

/**
 * Scans a directory recursively and returns file information
 * @param dirPath - Directory path to scan
 * @returns ServiceResponse with array of FileInfo objects
 */
async function scanLocalContent(
  dirPath?: string
): Promise<ServiceResponse<FileInfo[]>> {
  const articlesDir = dirPath || process.env['ARTICLES_DIR']

  if (!articlesDir) {
    return err(new Error('ARTICLES_DIR environment variable is not set'))
  }

  const files = await scanDirectoryRecursive(articlesDir, articlesDir)
  return files
}

/**
 * Gets the directory from a file path
 */
function getDirectory(path: string): string {
  const lastSlash = path.lastIndexOf('/')
  return lastSlash === -1 ? '' : path.substring(0, lastSlash)
}

/**
 * Checks if a file should be included in article listings
 */
function isArticle(file: FileInfo): boolean {
  return (
    file.type === 'markdown' &&
    !file.sourcePath.endsWith('.md.meta') &&
    !isIndex(file.sourcePath)
  )
}

/**
 * Creates initial article link data from file info
 */
function createArticleLink(file: FileInfo): ArticleLink {
  const slug = file.sourcePath
    .substring(file.sourcePath.lastIndexOf('/') + 1)
    .replace('.md', '')

  return {
    sourcePath: file.sourcePath,
    slug,
    date: file.lastModified
  }
}

/**
 * Groups markdown files by their directory
 */
function groupFilesByDirectory(files: FileInfo[]): Map<string, FileInfo[]> {
  const filesByDir = new Map<string, FileInfo[]>()

  files.forEach(file => {
    if (file.type === 'markdown' && !file.sourcePath.endsWith('.md.meta')) {
      const dir = getDirectory(file.sourcePath)
      if (!filesByDir.has(dir)) {
        filesByDir.set(dir, [])
      }
      filesByDir.get(dir)!.push(file)
    }
  })

  return filesByDir
}

/**
 * Gets article files from a directory (excluding index files)
 */
function getArticleFilesFromDirectory(dirFiles: FileInfo[]): FileInfo[] {
  return dirFiles.filter(isArticle)
}

/**
 * Attaches article links to an index file
 */
function attachArticleLinksToIndex(
  indexFile: FileInfo,
  filesByDir: Map<string, FileInfo[]>
): FileInfo {
  const dir = getDirectory(indexFile.sourcePath)
  const dirFiles = filesByDir.get(dir) || []
  const articleFiles = getArticleFilesFromDirectory(dirFiles)
  const articleLinks = articleFiles.map(createArticleLink)

  console.log(
    `Found ${articleLinks.length} articles for index at ${indexFile.sourcePath}`
  )

  return {
    ...indexFile,
    articleLinks
  }
}

/**
 * Processes a single file, potentially attaching article links
 */
function processFile(
  file: FileInfo,
  filesByDir: Map<string, FileInfo[]>
): FileInfo {
  if (isIndex(file.sourcePath)) {
    return attachArticleLinksToIndex(file, filesByDir)
  }
  return file
}

/**
 * Processes all files, attaching article links to index files
 */
function processAllFiles(
  files: FileInfo[],
  filesByDir: Map<string, FileInfo[]>
): FileInfo[] {
  return files.map(file => processFile(file, filesByDir))
}

/**
 * Main function that orchestrates file content processing
 * @param githubContent - GitHub repository content response
 * @returns Collection of content files ready for processing
 */
export async function processFilesContent(
  githubContent: ServiceResponse<FileCollection>
): Promise<ServiceResponse<FileCollection>> {
  if (!githubContent.success) {
    return githubContent
  }

  if (!githubContent.data) {
    return err(new Error('No data in github content'))
  }

  let files = githubContent.data.files
  let localFiles: ServiceResponse<FileInfo[]> | null = null
  console.log(`Processing ${files.length} files from repository`)

  switch (githubContent.data.mode) {
    case 'new':
      console.log(`Need to generate only new files, passing them by`)
      break
    case 'local':
    case 'all':
      console.log(`Need to generate all the files, scanning for them`)
      localFiles = await scanLocalContent()
      if (!localFiles.success || !localFiles.data) {
        return err(new Error('Failed to scan local files'))
      }
      files = localFiles.data
      break
    default:
      return err(new Error('Unknown generation mode'))
  }

  if (files.length === 0) {
    console.log('No files to process, skipping next steps')
    return ok({
      files: [],
      lastFetch: null,
      repoSha: null,
      mode: 'skip'
    })
  }

  // Group files by directory
  const filesByDir = groupFilesByDirectory(files)

  // Process each file and attach article links to index files
  const processedFiles = processAllFiles(files, filesByDir)

  return ok({
    files: processedFiles,
    lastFetch: githubContent.data.lastFetch,
    repoSha: githubContent.data.repoSha,
    mode: githubContent.data.mode
  })
}
