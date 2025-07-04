import type {FileInfo} from '../types.ts'

const repoCache = new Map<string, FileInfo>()

/**
 * Stores file in cache
 * @param file - File to cache
 */
export function storeInCache(file: FileInfo): void {
  repoCache.set(file.sourcePath, file)
  console.log(`Cached file ${file.sourcePath} with SHA ${file.sha}`)
}

/**
 * Checks if cached content is still valid
 * @param cacheEntry - Cache entry to check
 * @param currentSha - Current repository SHA
 * @returns Whether cache is valid
 */
export function isCacheValid(sha: string, path: string): boolean {
  const cachedFile = repoCache.get(path)
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
