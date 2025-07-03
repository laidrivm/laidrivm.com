import type {CacheEntry, GitHubRepoContent} from '../types.ts'

const repoCache = new Map<string, CacheEntry>()

/**
 * Gets the cache key for a repository
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Cache key
 */
function getCacheKey(owner: string, repo: string): string {
  return `${owner}/${repo}`
}

/**
 * Checks if cached content is still valid
 * @param cacheEntry - Cache entry to check
 * @param currentSha - Current repository SHA
 * @returns Whether cache is valid
 */
export function isCacheValid(
  cacheEntry: CacheEntry,
  currentSha: string
): boolean {
  return cacheEntry.content.repoSha === currentSha
}

/**
 * Stores content in cache
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param content - Content to cache
 */
export function storeInCache(
  owner: string,
  repo: string,
  content: GitHubRepoContent
): void {
  const cacheKey = getCacheKey(owner, repo)
  repoCache.set(cacheKey, {
    content,
    timestamp: Date.now()
  })
  console.log(`Cached content for ${cacheKey} with SHA ${content.repoSha}`)
}

/**
 * Retrieves content from cache
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Cached content or null
 */
export function getFromCache(
  owner: string,
  repo: string
): GitHubRepoContent | null {
  const cacheKey = getCacheKey(owner, repo)
  const cacheEntry = repoCache.get(cacheKey)

  if (!cacheEntry) {
    return null
  }

  return cacheEntry.content
}

/**
 * Invalidates cache for a repository
 * @param owner - Repository owner
 * @param repo - Repository name
 */
export function invalidateCache(owner: string, repo: string): void {
  const cacheKey = getCacheKey(owner, repo)
  if (repoCache.has(cacheKey)) {
    repoCache.delete(cacheKey)
    console.log(`Invalidated cache for ${cacheKey}`)
  }
}
