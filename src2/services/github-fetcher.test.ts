import {test, expect, describe, beforeEach, afterEach, mock} from 'bun:test'

import {fetchGitHubContent} from './github-fetcher.ts'

// Mock the cache module
const mockGetFromCache = mock(() => null)
const mockIsCacheValid = mock(() => false)
const mockInvalidateCache = mock(() => {})
const mockStoreInCache = mock(() => {})

// Mock the utils module
const mockOk = mock((data: any) => ({success: true, data}))
const mockErr = mock((error: any) => ({success: false, error}))

// Mock Octokit with rate limiting callbacks
const mockOctokit = {
  rest: {
    repos: {
      getContent: mock(),
      listCommits: mock()
    }
  }
}

// Mock the Octokit constructor to capture options
const mockOctokitConstructor = mock().mockImplementation(options => {
  // Store the options for testing rate limiting
  mockOctokitConstructor.lastOptions = options
  return mockOctokit
})

// Mock console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
}

let consoleLogs: string[] = []
let consoleWarns: string[] = []
let consoleErrors: string[] = []

beforeEach(() => {
  // Reset all mocks
  mockGetFromCache.mockReset()
  mockIsCacheValid.mockReset()
  mockInvalidateCache.mockReset()
  mockStoreInCache.mockReset()
  mockOk.mockReset()
  mockErr.mockReset()
  mockOctokit.rest.repos.getContent.mockReset()
  mockOctokit.rest.repos.listCommits.mockReset()
  mockOctokitConstructor.mockReset()

  // Reset console captures
  consoleLogs = []
  consoleWarns = []
  consoleErrors = []

  // Mock console methods
  console.log = (...args: any[]) => {
    consoleLogs.push(args.join(' '))
  }
  console.warn = (...args: any[]) => {
    consoleWarns.push(args.join(' '))
  }
  console.error = (...args: any[]) => {
    consoleErrors.push(args.join(' '))
  }

  // Set up default environment
  process.env.GITHUB_TOKEN = 'test-token'
  process.env.GITHUB_REPO = 'https://github.com/test-owner/test-repo'

  // Set up default mock implementations
  mockOk.mockImplementation((data: any) => ({success: true, data}))
  mockErr.mockImplementation((error: any) => ({success: false, error}))
  mockGetFromCache.mockReturnValue(null)
  mockIsCacheValid.mockReturnValue(false)
  mockOctokitConstructor.mockImplementation(options => {
    mockOctokitConstructor.lastOptions = options
    return mockOctokit
  })
})

afterEach(() => {
  // Restore console methods
  console.log = originalConsole.log
  console.warn = originalConsole.warn
  console.error = originalConsole.error

  // Clean up environment
  delete process.env.GITHUB_TOKEN
  delete process.env.GITHUB_REPO
})

// Mock modules at the top level
mock.module('octokit', () => ({
  Octokit: mockOctokitConstructor
}))

mock.module('./cache.ts', () => ({
  getFromCache: mockGetFromCache,
  isCacheValid: mockIsCacheValid,
  invalidateCache: mockInvalidateCache,
  storeInCache: mockStoreInCache
}))

mock.module('../utils.ts', () => ({
  ok: mockOk,
  err: mockErr
}))

// Helper functions
function createMockCommit(sha: string, date = '2025-01-01T00:00:00Z') {
  return {
    sha,
    commit: {
      author: {date},
      committer: {date}
    }
  }
}

function createMockFileContent(content: string, sha = 'file-sha') {
  return {
    sha,
    size: content.length,
    type: 'file' as const
  }
}

function createMockDirectoryContent() {
  return [
    {
      type: 'file' as const,
      path: 'README.md',
      sha: 'readme-sha'
    },
    {
      type: 'file' as const,
      path: 'src/index.ts',
      sha: 'index-sha'
    },
    {
      type: 'dir' as const,
      path: 'docs',
      sha: 'docs-sha'
    }
  ]
}

describe('fetchGitHubContent - GitHub API Integration', () => {
  test('should successfully fetch repository content without cache', async () => {
    // Mock successful API responses
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('latest-sha')]
    })

    mockOctokit.rest.repos.getContent
      .mockResolvedValueOnce({
        data: createMockDirectoryContent()
      })
      .mockResolvedValueOnce({
        data: '# Test Repository'
      })
      .mockResolvedValueOnce({
        data: createMockFileContent('# Test Repository', 'readme-sha')
      })
      .mockResolvedValueOnce({
        data: [createMockCommit('readme-commit-sha')]
      })
      .mockResolvedValueOnce({
        data: 'console.log("Hello World")'
      })
      .mockResolvedValueOnce({
        data: createMockFileContent('console.log("Hello World")', 'index-sha')
      })
      .mockResolvedValueOnce({
        data: [createMockCommit('index-commit-sha')]
      })
      .mockResolvedValueOnce({
        data: []
      })

    const result = await fetchGitHubContent()

    expect(result.success).toBe(true)
    expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      per_page: 1
    })
    expect(mockStoreInCache).toHaveBeenCalled()
    expect(consoleLogs).toContain('Latest commit SHA: latest-sha')
    expect(consoleLogs).toContain(
      'Fetching fresh content for test-owner/test-repo'
    )
  })

  test('should handle repository with no commits', async () => {
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: []
    })

    const result = await fetchGitHubContent()

    expect(result.success).toBe(false)
    expect(mockErr).toHaveBeenCalledWith(
      new Error('No commits found in repository')
    )
  })

  test('should handle GitHub API errors', async () => {
    const apiError = new Error('GitHub API Error')
    mockOctokit.rest.repos.listCommits.mockRejectedValue(apiError)

    const result = await fetchGitHubContent()

    expect(result.success).toBe(false)
    expect(mockErr).toHaveBeenCalledWith(apiError)
  })

  test('should handle invalid repository URL', async () => {
    process.env.GITHUB_REPO = 'invalid-url'

    const result = await fetchGitHubContent()

    expect(result.success).toBe(false)
    expect(mockErr).toHaveBeenCalled()
  })

  test('should handle file fetch errors gracefully', async () => {
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('test-sha')]
    })

    mockOctokit.rest.repos.getContent
      .mockResolvedValueOnce({
        data: [
          {
            type: 'file' as const,
            path: 'error-file.txt',
            sha: 'error-sha'
          }
        ]
      })
      .mockRejectedValueOnce(new Error('File fetch error'))

    const result = await fetchGitHubContent()

    expect(consoleErrors).toContain(
      'Failed to fetch error-file.txt: File fetch error'
    )
    // Should still succeed with other files
    expect(result.success).toBe(true)
  })

  test('should handle directories recursively', async () => {
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('recursive-sha')]
    })

    // Root directory content
    mockOctokit.rest.repos.getContent
      .mockResolvedValueOnce({
        data: [
          {
            type: 'dir' as const,
            path: 'src',
            sha: 'src-sha'
          }
        ]
      })
      // Subdirectory content
      .mockResolvedValueOnce({
        data: [
          {
            type: 'file' as const,
            path: 'src/index.ts',
            sha: 'nested-file-sha'
          }
        ]
      })
      // File content for nested file
      .mockResolvedValueOnce({
        data: 'export default "nested"'
      })
      .mockResolvedValueOnce({
        data: createMockFileContent(
          'export default "nested"',
          'nested-file-sha'
        )
      })
      .mockResolvedValueOnce({
        data: [createMockCommit('nested-commit-sha')]
      })

    const result = await fetchGitHubContent()

    expect(result.success).toBe(true)
    expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      path: 'src'
    })
  })

  test('should handle non-string file content', async () => {
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('binary-sha')]
    })

    mockOctokit.rest.repos.getContent
      .mockResolvedValueOnce({
        data: [
          {
            type: 'file' as const,
            path: 'binary-file.png',
            sha: 'binary-sha'
          }
        ]
      })
      // Return non-string content (binary file)
      .mockResolvedValueOnce({
        data: {type: 'file', content: 'base64content...', encoding: 'base64'}
      })

    const result = await fetchGitHubContent()

    expect(consoleErrors).toContain(
      'Failed to fetch binary-file.png: Expected file content, got object'
    )
    expect(result.success).toBe(true) // Should continue with other files
  })

  test('should handle directory response when expecting file', async () => {
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('dir-sha')]
    })

    mockOctokit.rest.repos.getContent
      .mockResolvedValueOnce({
        data: [
          {
            type: 'file' as const,
            path: 'should-be-file',
            sha: 'dir-sha'
          }
        ]
      })
      .mockResolvedValueOnce({
        data: 'file content'
      })
      // Return array when expecting single file info
      .mockResolvedValueOnce({
        data: [{type: 'dir', path: 'should-be-file'}]
      })

    const result = await fetchGitHubContent()

    expect(consoleErrors).toContain(
      'Failed to fetch should-be-file: Expected file, got directory'
    )
    expect(result.success).toBe(true)
  })

  test('should handle last modified date fetch errors', async () => {
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('lastmod-sha')]
    })

    mockOctokit.rest.repos.getContent
      .mockResolvedValueOnce({
        data: [
          {
            type: 'file' as const,
            path: 'test-file.txt',
            sha: 'file-sha'
          }
        ]
      })
      .mockResolvedValueOnce({
        data: 'test content'
      })
      .mockResolvedValueOnce({
        data: createMockFileContent('test content', 'file-sha')
      })
      // Fail to get last modified date - this should be the listCommits call for the specific file
      .mockResolvedValueOnce({
        data: [] // No commits for this file
      })

    const result = await fetchGitHubContent()

    // The function should fallback to new Date() when no commits are found
    expect(result.success).toBe(true)
  })

  test('should handle last modified date API errors', async () => {
    // First listCommits call for latest commit SHA
    mockOctokit.rest.repos.listCommits
      .mockResolvedValueOnce({
        data: [createMockCommit('lastmod-sha')]
      })
      // Second listCommits call for file last modified date - this one fails
      .mockRejectedValueOnce(new Error('Commits API error'))

    mockOctokit.rest.repos.getContent
      .mockResolvedValueOnce({
        data: [
          {
            type: 'file' as const,
            path: 'test-file.txt',
            sha: 'file-sha'
          }
        ]
      })
      .mockResolvedValueOnce({
        data: 'test content'
      })
      .mockResolvedValueOnce({
        data: createMockFileContent('test content', 'file-sha')
      })

    const result = await fetchGitHubContent()

    expect(consoleWarns).toContain(
      'Failed to get last modified date for test-file.txt: Error: Commits API error'
    )
    expect(result.success).toBe(true) // Should fallback to current date
  })

  test('should log file last modified dates correctly', async () => {
    const testDate = '2025-01-15T10:30:00Z'

    // First listCommits call for latest commit SHA
    mockOctokit.rest.repos.listCommits
      .mockResolvedValueOnce({
        data: [createMockCommit('log-sha')]
      })
      // Second listCommits call for file last modified date
      .mockResolvedValueOnce({
        data: [createMockCommit('commit-sha', testDate)]
      })

    mockOctokit.rest.repos.getContent
      .mockResolvedValueOnce({
        data: [
          {
            type: 'file' as const,
            path: 'dated-file.txt',
            sha: 'dated-sha'
          }
        ]
      })
      .mockResolvedValueOnce({
        data: 'dated content'
      })
      .mockResolvedValueOnce({
        data: createMockFileContent('dated content', 'dated-sha')
      })

    await fetchGitHubContent()

    expect(consoleLogs).toContain(
      `Last modified date for dated-file.txt found: ${testDate}${testDate}`
    )
  })

  test('should parse repository URL correctly', async () => {
    process.env.GITHUB_REPO = 'https://github.com/microsoft/vscode'

    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('vscode-sha')]
    })
    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: []
    })

    await fetchGitHubContent()

    expect(consoleLogs).toContain(
      'Trying to fetch repository content for owner: microsoft and repo: vscode'
    )
    expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith({
      owner: 'microsoft',
      repo: 'vscode',
      per_page: 1
    })
  })

  test('should handle missing environment variables', async () => {
    delete process.env.GITHUB_REPO

    const result = await fetchGitHubContent()

    expect(result.success).toBe(false)
    expect(mockErr).toHaveBeenCalled()
  })

  test('should handle fetchRepositoryContent errors', async () => {
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('error-sha')]
    })

    // Mock error in fetchRepositoryContent
    mockOctokit.rest.repos.getContent.mockRejectedValue(
      new Error('Repository content fetch error')
    )

    const result = await fetchGitHubContent()

    expect(result.success).toBe(false)
    expect(mockErr).toHaveBeenCalledWith(
      new Error('Repository content fetch error')
    )
  })
})

describe('fetchGitHubContent - Octokit Configuration', () => {
  test('should create Octokit with proper configuration', async () => {
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('config-sha')]
    })
    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: []
    })

    await fetchGitHubContent()

    expect(mockOctokitConstructor).toHaveBeenCalledWith({
      auth: 'test-token',
      throttle: expect.objectContaining({
        onRateLimit: expect.any(Function),
        onSecondaryRateLimit: expect.any(Function)
      }),
      retry: {
        doNotRetry: ['429']
      }
    })
  })

  test('should handle rate limiting correctly', async () => {
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('rate-limit-sha')]
    })
    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: []
    })

    await fetchGitHubContent()

    const options = mockOctokitConstructor.lastOptions
    expect(options.throttle).toBeDefined()

    // Test rate limit handler
    const shouldRetry = options.throttle.onRateLimit(60, {
      request: {retryCount: 2}
    })
    expect(shouldRetry).toBe(true)
    expect(consoleWarns).toContain(
      'GitHub rate limit hit. Retrying after 60 seconds'
    )

    // Test max retries
    const shouldNotRetry = options.throttle.onRateLimit(60, {
      request: {retryCount: 3}
    })
    expect(shouldNotRetry).toBe(undefined)

    // Test secondary rate limit handler
    const shouldRetrySecondary = options.throttle.onSecondaryRateLimit(30, {
      request: {retryCount: 0}
    })
    expect(shouldRetrySecondary).toBe(true)
    expect(consoleWarns).toContain(
      'GitHub secondary rate limit hit. Retrying after 30 seconds'
    )

    // Test secondary rate limit max retries
    const shouldNotRetrySecondary = options.throttle.onSecondaryRateLimit(30, {
      request: {retryCount: 1}
    })
    expect(shouldNotRetrySecondary).toBe(undefined)
  })
})

describe('fetchGitHubContent - Cache Integration', () => {
  test('should use cached content when valid', async () => {
    const mockCachedContent = {
      files: new Map(),
      lastFetch: new Date(),
      repoSha: 'cached-sha'
    }

    mockGetFromCache.mockReturnValue(mockCachedContent)
    mockIsCacheValid.mockReturnValue(true)
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('cached-sha')]
    })

    const result = await fetchGitHubContent()

    expect(result.success).toBe(true)
    expect(result.data).toBe(mockCachedContent)
    expect(mockOctokit.rest.repos.getContent).not.toHaveBeenCalled()
    expect(consoleLogs).toContain(
      'Using cached content for test-owner/test-repo (SHA: cached-sha)'
    )
  })

  test('should invalidate old cache when SHA changes', async () => {
    const mockCachedContent = {
      files: new Map(),
      lastFetch: new Date(),
      repoSha: 'old-sha'
    }

    mockGetFromCache.mockReturnValue(mockCachedContent)
    mockIsCacheValid.mockReturnValue(false)
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('new-sha')]
    })
    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: []
    })

    await fetchGitHubContent()

    expect(mockInvalidateCache).toHaveBeenCalledWith('test-owner', 'test-repo')
    expect(consoleLogs).toContain(
      'Fetching fresh content for test-owner/test-repo'
    )
  })

  test('should follow complete cache workflow', async () => {
    // First call - no cache
    mockGetFromCache.mockReturnValueOnce(null)
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('workflow-sha')]
    })
    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: []
    })

    const firstResult = await fetchGitHubContent()

    expect(firstResult.success).toBe(true)
    expect(mockStoreInCache).toHaveBeenCalledWith(
      'test-owner',
      'test-repo',
      expect.objectContaining({
        repoSha: 'workflow-sha'
      })
    )

    // Second call - with valid cache
    const cachedContent = {
      files: new Map(),
      lastFetch: new Date(),
      repoSha: 'workflow-sha'
    }
    mockGetFromCache.mockReturnValueOnce(cachedContent)
    mockIsCacheValid.mockReturnValueOnce(true)

    const secondResult = await fetchGitHubContent()

    expect(secondResult.success).toBe(true)
    expect(secondResult.data).toBe(cachedContent)
    expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledTimes(1) // Only from first call
  })

  test('should invalidate cache when SHA changes', async () => {
    const oldCachedContent = {
      files: new Map(),
      lastFetch: new Date(),
      repoSha: 'old-workflow-sha'
    }

    mockGetFromCache.mockReturnValue(oldCachedContent)
    mockIsCacheValid.mockReturnValue(false) // Cache is invalid
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [createMockCommit('new-workflow-sha')]
    })
    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: []
    })

    const result = await fetchGitHubContent()

    expect(mockInvalidateCache).toHaveBeenCalledWith('test-owner', 'test-repo')
    expect(mockStoreInCache).toHaveBeenCalledWith(
      'test-owner',
      'test-repo',
      expect.objectContaining({
        repoSha: 'new-workflow-sha'
      })
    )
    expect(result.success).toBe(true)
  })
})
