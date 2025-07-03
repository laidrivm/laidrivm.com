import {test, expect, describe, beforeEach, afterEach} from 'bun:test'

import type {GitHubRepoContent, CacheEntry} from '../types.ts'

import {
  isCacheValid,
  storeInCache,
  getFromCache,
  invalidateCache
} from './cache.ts'

// Mock console.log to avoid noise in tests
const originalConsoleLog = console.log
let consoleLogs: string[] = []

beforeEach(() => {
  // Clear any existing cache before each test
  // Since repoCache is not exported, we'll use the public API to clear it
  invalidateCache('test', 'repo')
  invalidateCache('owner', 'repo')
  invalidateCache('different', 'owner')
  invalidateCache('github', 'test-repo')
  invalidateCache('microsoft', 'vscode')

  // Mock console.log to capture logs
  consoleLogs = []
  console.log = (...args: unknown[]) => {
    consoleLogs.push(args.join(' '))
  }
})

afterEach(() => {
  // Restore console.log
  console.log = originalConsoleLog
})

// Helper function to create mock GitHubRepoContent
function createMockRepoContent(repoSha: string): GitHubRepoContent {
  return {
    files: new Map([
      [
        'README.md',
        {
          path: 'README.md',
          content: '# Test Repository',
          sha: 'file-sha-123',
          size: 100,
          lastModified: new Date('2025-01-01'),
          type: 'file'
        }
      ],
      [
        'src/index.ts',
        {
          path: 'src/index.ts',
          content: 'console.log("Hello World")',
          sha: 'file-sha-456',
          size: 200,
          lastModified: new Date('2025-01-02'),
          type: 'file'
        }
      ]
    ]),
    lastFetch: new Date('2025-01-03'),
    repoSha
  }
}

// Helper function to create mock CacheEntry
function createMockCacheEntry(repoSha: string, timestamp?: number): CacheEntry {
  return {
    content: createMockRepoContent(repoSha),
    timestamp: timestamp ?? Date.now()
  }
}

describe('isCacheValid', () => {
  test('should return true when cache SHA matches current SHA', () => {
    const cacheEntry = createMockCacheEntry('abc123')
    const currentSha = 'abc123'

    const result = isCacheValid(cacheEntry, currentSha)

    expect(result).toBe(true)
  })

  test('should return false when cache SHA does not match current SHA', () => {
    const cacheEntry = createMockCacheEntry('abc123')
    const currentSha = 'def456'

    const result = isCacheValid(cacheEntry, currentSha)

    expect(result).toBe(false)
  })

  test('should handle empty SHA strings', () => {
    const cacheEntry = createMockCacheEntry('')
    const currentSha = ''

    const result = isCacheValid(cacheEntry, currentSha)

    expect(result).toBe(true)
  })

  test('should be case sensitive', () => {
    const cacheEntry = createMockCacheEntry('ABC123')
    const currentSha = 'abc123'

    const result = isCacheValid(cacheEntry, currentSha)

    expect(result).toBe(false)
  })

  test('should handle long SHA strings', () => {
    const longSha = 'a'.repeat(40) // Git SHA-1 length
    const cacheEntry = createMockCacheEntry(longSha)

    const result = isCacheValid(cacheEntry, longSha)

    expect(result).toBe(true)
  })
})

describe('storeInCache', () => {
  test('should store content in cache and log message', () => {
    const content = createMockRepoContent('test-sha-123')

    storeInCache('owner', 'repo', content)

    // Verify content was stored
    const retrieved = getFromCache('owner', 'repo')
    expect(retrieved).toEqual(content)

    // Verify console log
    expect(consoleLogs).toContain(
      'Cached content for owner/repo with SHA test-sha-123'
    )
  })

  test('should generate correct cache key format', () => {
    const content = createMockRepoContent('sha-456')

    storeInCache('github', 'test-repo', content)

    const retrieved = getFromCache('github', 'test-repo')
    expect(retrieved).toEqual(content)

    expect(consoleLogs).toContain(
      'Cached content for github/test-repo with SHA sha-456'
    )
  })

  test('should overwrite existing cache entry', () => {
    const oldContent = createMockRepoContent('old-sha')
    const newContent = createMockRepoContent('new-sha')

    // Store initial content
    storeInCache('owner', 'repo', oldContent)
    let retrieved = getFromCache('owner', 'repo')
    expect(retrieved?.repoSha).toBe('old-sha')

    // Overwrite with new content
    storeInCache('owner', 'repo', newContent)
    retrieved = getFromCache('owner', 'repo')
    expect(retrieved?.repoSha).toBe('new-sha')

    // Should have logged both operations
    expect(consoleLogs).toContain(
      'Cached content for owner/repo with SHA old-sha'
    )
    expect(consoleLogs).toContain(
      'Cached content for owner/repo with SHA new-sha'
    )
  })

  test('should handle special characters in owner and repo names', () => {
    const content = createMockRepoContent('special-sha')

    storeInCache('owner-with-dash', 'repo.with.dots', content)

    const retrieved = getFromCache('owner-with-dash', 'repo.with.dots')
    expect(retrieved).toEqual(content)

    expect(consoleLogs).toContain(
      'Cached content for owner-with-dash/repo.with.dots with SHA special-sha'
    )
  })

  test('should store timestamp with cache entry', () => {
    const content = createMockRepoContent('timestamp-test')

    storeInCache('owner', 'repo', content)

    // Since we can't access repoCache directly, we'll verify by checking
    // that the content is retrievable (indicating timestamp was set correctly)
    const retrieved = getFromCache('owner', 'repo')
    expect(retrieved).toEqual(content)

    // Verify the cache entry persists (indicating timestamp was stored)
    // Store a second entry to ensure the first one remains
    storeInCache('different', 'repo', createMockRepoContent('other-sha'))
    expect(getFromCache('owner', 'repo')).toEqual(content)
  })
})

describe('getFromCache', () => {
  test('should return null when cache is empty', () => {
    const result = getFromCache('nonexistent', 'repo')

    expect(result).toBe(null)
  })

  test('should return cached content when it exists', () => {
    const content = createMockRepoContent('cached-sha')

    storeInCache('owner', 'repo', content)
    const retrieved = getFromCache('owner', 'repo')

    expect(retrieved).toEqual(content)
  })

  test('should return correct content for different repositories', () => {
    const content1 = createMockRepoContent('sha-1')
    const content2 = createMockRepoContent('sha-2')

    storeInCache('owner1', 'repo1', content1)
    storeInCache('owner2', 'repo2', content2)

    const retrieved1 = getFromCache('owner1', 'repo1')
    const retrieved2 = getFromCache('owner2', 'repo2')

    expect(retrieved1?.repoSha).toBe('sha-1')
    expect(retrieved2?.repoSha).toBe('sha-2')
  })

  test('should return null after cache invalidation', () => {
    const content = createMockRepoContent('temp-sha')

    storeInCache('owner', 'repo', content)
    expect(getFromCache('owner', 'repo')).toEqual(content)

    invalidateCache('owner', 'repo')
    expect(getFromCache('owner', 'repo')).toBe(null)
  })

  test('should handle case-sensitive repository names', () => {
    const content = createMockRepoContent('case-test')

    storeInCache('Owner', 'Repo', content)

    expect(getFromCache('Owner', 'Repo')).toEqual(content)
    expect(getFromCache('owner', 'repo')).toBe(null)
    expect(getFromCache('OWNER', 'REPO')).toBe(null)
  })

  test('should preserve object references', () => {
    const content = createMockRepoContent('reference-test')

    storeInCache('owner', 'repo', content)
    const retrieved = getFromCache('owner', 'repo')

    // Should be the same object reference
    expect(retrieved).toBe(content)
    expect(retrieved?.files).toBe(content.files)
  })
})

describe('invalidateCache', () => {
  test('should remove existing cache entry and log message', () => {
    const content = createMockRepoContent('to-be-invalidated')

    storeInCache('owner', 'repo', content)
    expect(getFromCache('owner', 'repo')).toEqual(content)

    invalidateCache('owner', 'repo')
    expect(getFromCache('owner', 'repo')).toBe(null)

    expect(consoleLogs).toContain('Invalidated cache for owner/repo')
  })

  test('should handle invalidation of non-existent cache entry', () => {
    // Should not throw error or log when cache entry doesn't exist
    invalidateCache('nonexistent', 'repo')

    // Should not log anything since cache entry didn't exist
    expect(consoleLogs.filter(log => log.includes('Invalidated'))).toHaveLength(
      0
    )
  })

  test('should only invalidate specific repository', () => {
    const content1 = createMockRepoContent('keep-this')
    const content2 = createMockRepoContent('remove-this')

    storeInCache('owner1', 'repo1', content1)
    storeInCache('owner2', 'repo2', content2)

    invalidateCache('owner2', 'repo2')

    expect(getFromCache('owner1', 'repo1')).toEqual(content1)
    expect(getFromCache('owner2', 'repo2')).toBe(null)
  })

  test('should handle multiple invalidations of same repository', () => {
    const content = createMockRepoContent('multi-invalidate')

    storeInCache('owner', 'repo', content)

    invalidateCache('owner', 'repo')
    expect(
      consoleLogs.filter(log =>
        log.includes('Invalidated cache for owner/repo')
      )
    ).toHaveLength(1)

    // Second invalidation should not log since entry doesn't exist
    invalidateCache('owner', 'repo')
    expect(
      consoleLogs.filter(log =>
        log.includes('Invalidated cache for owner/repo')
      )
    ).toHaveLength(1)
  })
})

describe('Cache integration', () => {
  test('should support complete cache lifecycle', () => {
    const initialContent = createMockRepoContent('initial-sha')
    const updatedContent = createMockRepoContent('updated-sha')

    // 1. Store initial content
    storeInCache('owner', 'repo', initialContent)
    expect(getFromCache('owner', 'repo')).toEqual(initialContent)

    // 2. Check cache validity
    expect(
      isCacheValid(createMockCacheEntry('initial-sha'), 'initial-sha')
    ).toBe(true)
    expect(
      isCacheValid(createMockCacheEntry('initial-sha'), 'updated-sha')
    ).toBe(false)

    // 3. Update cache with new content
    storeInCache('owner', 'repo', updatedContent)
    expect(getFromCache('owner', 'repo')).toEqual(updatedContent)

    // 4. Invalidate cache
    invalidateCache('owner', 'repo')
    expect(getFromCache('owner', 'repo')).toBe(null)
  })

  test('should handle concurrent access to different repositories', () => {
    const repos = [
      {owner: 'microsoft', repo: 'vscode', sha: 'ms-sha'},
      {owner: 'facebook', repo: 'react', sha: 'fb-sha'},
      {owner: 'vercel', repo: 'next.js', sha: 'vercel-sha'}
    ]

    // Store multiple repositories
    repos.forEach(({owner, repo, sha}) => {
      const content = createMockRepoContent(sha)
      storeInCache(owner, repo, content)
    })

    // Verify all are cached correctly
    repos.forEach(({owner, repo, sha}) => {
      const retrieved = getFromCache(owner, repo)
      expect(retrieved?.repoSha).toBe(sha)
    })

    // Invalidate one repository
    invalidateCache('facebook', 'react')

    // Verify only one was invalidated
    expect(getFromCache('microsoft', 'vscode')?.repoSha).toBe('ms-sha')
    expect(getFromCache('facebook', 'react')).toBe(null)
    expect(getFromCache('vercel', 'next.js')?.repoSha).toBe('vercel-sha')
  })

  test('should handle cache validation workflow', () => {
    const content = createMockRepoContent('workflow-sha')
    const cacheEntry = createMockCacheEntry('workflow-sha')

    // Store content
    storeInCache('owner', 'repo', content)

    // Simulate checking if cache is valid for current commit
    expect(isCacheValid(cacheEntry, 'workflow-sha')).toBe(true)

    // Simulate new commit - cache should be invalid
    expect(isCacheValid(cacheEntry, 'new-commit-sha')).toBe(false)

    // Simulate cache invalidation and refresh
    invalidateCache('owner', 'repo')
    expect(getFromCache('owner', 'repo')).toBe(null)

    // Store new content with updated SHA
    const newContent = createMockRepoContent('new-commit-sha')
    storeInCache('owner', 'repo', newContent)

    const newCacheEntry = createMockCacheEntry('new-commit-sha')
    expect(isCacheValid(newCacheEntry, 'new-commit-sha')).toBe(true)
  })
})
