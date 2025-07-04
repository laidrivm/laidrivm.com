import {describe, it, expect, beforeEach, afterEach, mock} from 'bun:test'

// Mock cache functions
const mockIsCacheValid = mock()
const mockInvalidateCache = mock()
const mockStoreInCache = mock()

// Mock Octokit
const mockOctokit = {
  rest: {
    repos: {
      getContent: mock(),
      listCommits: mock()
    }
  }
}

// Mock modules
mock.module('./cache.ts', () => ({
  isCacheValid: mockIsCacheValid,
  invalidateCache: mockInvalidateCache,
  storeInCache: mockStoreInCache
}))

mock.module('octokit', () => ({
  Octokit: mock(() => mockOctokit)
}))

describe('github-fetcher', () => {
  const originalEnv = process.env
  const mockConsoleLog = mock()
  const mockConsoleWarn = mock()
  const mockConsoleError = mock()

  beforeEach(() => {
    // Reset mocks
    Object.values(mockOctokit.rest.repos).forEach(m => m.mockClear())
    ;[
      mockIsCacheValid,
      mockInvalidateCache,
      mockStoreInCache,
      mockConsoleLog,
      mockConsoleWarn,
      mockConsoleError
    ].forEach(m => m.mockClear())

    // Mock console
    console.log = mockConsoleLog
    console.warn = mockConsoleWarn
    console.error = mockConsoleError

    // Set environment
    process.env = {
      ...originalEnv,
      GITHUB_TOKEN: 'test-token',
      GITHUB_REPO: 'https://github.com/testowner/testrepo'
    }

    // Default mocks
    mockIsCacheValid.mockReturnValue(false)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('fetchGitHubContent', () => {
    const setupSuccessfulFetch = (
      files = [{type: 'file', path: 'test.md', sha: 'sha1'}]
    ) => {
      mockOctokit.rest.repos.listCommits
        .mockResolvedValue({data: [{sha: 'repo-sha'}]})
        .mockResolvedValue({
          data: [
            {sha: 'file-sha', commit: {author: {date: '2024-01-01T00:00:00Z'}}}
          ]
        })
        .mockResolvedValue({
          data: [
            {sha: 'file-sha', commit: {author: {date: '2024-01-01T00:00:00Z'}}}
          ]
        })

      mockOctokit.rest.repos.getContent
        .mockResolvedValueOnce({data: files})
        .mockResolvedValueOnce({data: '# Test content'})
        .mockResolvedValueOnce({data: {sha: 'sha1', size: 100}})
    }

    it('should successfully fetch repository content', async () => {
      const {fetchGitHubContent} = await import('./github-fetcher.ts')
      setupSuccessfulFetch()

      const result = await fetchGitHubContent()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files).toHaveLength(1)
        expect(result.data.files[0].sourcePath).toBe('test.md')
        expect(result.data.repoSha).toBe('file-sha')
      }
    })

    it('should handle missing commits', async () => {
      const {fetchGitHubContent} = await import('./github-fetcher.ts')
      mockOctokit.rest.repos.listCommits.mockResolvedValue({data: []})

      const result = await fetchGitHubContent()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('No commits found in repository')
      }
    })

    it('should use cache when valid', async () => {
      const {fetchGitHubContent} = await import('./github-fetcher.ts')
      mockIsCacheValid.mockReturnValue(true)

      mockOctokit.rest.repos.listCommits
        .mockResolvedValueOnce({data: [{sha: 'repo-sha'}]})
        .mockResolvedValueOnce({data: [{sha: 'file-sha'}]})

      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: [{type: 'file', path: 'cached.md', sha: 'cached-sha'}]
      })

      const result = await fetchGitHubContent()

      expect(result.success).toBe(false) // No files processed, so it fails
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Content for cached.md is cached)'
      )
    })

    it('should handle directory recursion', async () => {
      const {fetchGitHubContent} = await import('./github-fetcher.ts')

      mockOctokit.rest.repos.listCommits
        .mockResolvedValue({data: [{sha: 'repo-sha'}]})
        .mockResolvedValue({
          data: [
            {sha: 'file-sha', commit: {author: {date: '2024-01-01T00:00:00Z'}}}
          ]
        })
        .mockResolvedValue({
          data: [
            {sha: 'file-sha', commit: {author: {date: '2024-01-01T00:00:00Z'}}}
          ]
        })

      mockOctokit.rest.repos.getContent
        .mockResolvedValueOnce({data: [{type: 'dir', path: 'docs'}]})
        .mockResolvedValueOnce({
          data: [{type: 'file', path: 'docs/guide.md', sha: 'guide-sha'}]
        })
        .mockResolvedValueOnce({data: '# Guide'})
        .mockResolvedValueOnce({data: {sha: 'guide-sha', size: 200}})

      const result = await fetchGitHubContent()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files[0].sourcePath).toBe('docs/guide.md')
      }
    })

    it('should handle file fetch errors', async () => {
      const {fetchGitHubContent} = await import('./github-fetcher.ts')

      mockOctokit.rest.repos.listCommits
        .mockResolvedValue({data: [{sha: 'repo-sha'}]})
        .mockResolvedValue({data: [{sha: 'file-sha'}]})

      mockOctokit.rest.repos.getContent
        .mockResolvedValueOnce({
          data: [{type: 'file', path: 'error.md', sha: 'error-sha'}]
        })
        .mockRejectedValueOnce(new Error('File not accessible'))

      const result = await fetchGitHubContent()

      expect(result.success).toBe(false)
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to fetch error.md:',
        'File not accessible'
      )
    })

    it('should handle non-string file content', async () => {
      const {fetchGitHubContent} = await import('./github-fetcher.ts')

      mockOctokit.rest.repos.listCommits
        .mockResolvedValue({data: [{sha: 'repo-sha'}]})
        .mockResolvedValue({data: [{sha: 'file-sha'}]})

      mockOctokit.rest.repos.getContent
        .mockResolvedValueOnce({
          data: [{type: 'file', path: 'binary.png', sha: 'binary-sha'}]
        })
        .mockResolvedValueOnce({data: {type: 'file', content: 'base64'}})

      const result = await fetchGitHubContent()

      expect(result.success).toBe(false)
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to fetch binary.png:',
        'Expected file content, got object'
      )
    })

    it('should handle last modified date errors', async () => {
      const {fetchGitHubContent} = await import('./github-fetcher.ts')

      mockOctokit.rest.repos.listCommits
        .mockResolvedValueOnce({data: [{sha: 'repo-sha'}]})
        .mockResolvedValueOnce({data: [{sha: 'file-sha'}]})
        .mockRejectedValueOnce(new Error('Commit history error'))

      mockOctokit.rest.repos.getContent
        .mockResolvedValueOnce({
          data: [{type: 'file', path: 'test.md', sha: 'test-sha'}]
        })
        .mockResolvedValueOnce({data: '# Test'})
        .mockResolvedValueOnce({data: {sha: 'test-sha', size: 100}})

      const result = await fetchGitHubContent()

      expect(result.success).toBe(true)
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Failed to get last modified date for test.md:',
        expect.any(Error)
      )
    })

    it('should create Octokit instance with proper logging', async () => {
      const {fetchGitHubContent} = await import('./github-fetcher.ts')

      // Mock successful response to avoid other errors
      mockOctokit.rest.repos.listCommits.mockResolvedValue({
        data: [{sha: 'test-sha'}]
      })
      mockOctokit.rest.repos.getContent.mockResolvedValue({data: []})

      // Trigger the function which creates Octokit
      await fetchGitHubContent()

      // Verify Octokit creation was logged
      expect(mockConsoleLog).toHaveBeenCalledWith('Creating Octokit instance')
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Trying to fetch repository content for owner: testowner and repo: testrepo'
      )
    })

    it('should test Octokit configuration', async () => {
      // Import to ensure Octokit constructor is called
      await import('./github-fetcher.ts')

      const OctokitConstructor = (await import('octokit')).Octokit as any
      expect(OctokitConstructor).toHaveBeenCalledWith({
        auth: 'test-token'
      })
    })

    it('should handle empty repository', async () => {
      const {fetchGitHubContent} = await import('./github-fetcher.ts')

      mockOctokit.rest.repos.listCommits.mockResolvedValue({
        data: [{sha: 'repo-sha'}]
      })
      mockOctokit.rest.repos.getContent.mockResolvedValue({data: []})

      const result = await fetchGitHubContent()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('No files fetched')
      }
    })

    it('should handle committer date fallback and empty commits', async () => {
      const {fetchGitHubContent} = await import('./github-fetcher.ts')

      mockOctokit.rest.repos.listCommits
        .mockResolvedValueOnce({data: [{sha: 'repo-sha'}]})
        .mockResolvedValueOnce({data: [{sha: 'file-sha'}]})
        .mockResolvedValueOnce({
          data: [
            {
              sha: 'file-sha',
              commit: {committer: {date: '2024-01-02T00:00:00Z'}}
            }
          ]
        })

      mockOctokit.rest.repos.getContent
        .mockResolvedValueOnce({
          data: [{type: 'file', path: 'test.md', sha: 'test-sha'}]
        })
        .mockResolvedValueOnce({data: '# Test'})
        .mockResolvedValueOnce({data: {sha: 'test-sha', size: 100}})

      const result = await fetchGitHubContent()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files[0].lastModified).toEqual(
          new Date('2024-01-02T00:00:00Z')
        )
      }
    })

    it('should handle empty commits array for last modified', async () => {
      const {fetchGitHubContent} = await import('./github-fetcher.ts')

      mockOctokit.rest.repos.listCommits
        .mockResolvedValueOnce({data: [{sha: 'repo-sha'}]})
        .mockResolvedValueOnce({data: [{sha: 'file-sha'}]})
        .mockResolvedValueOnce({data: []}) // Empty commits

      mockOctokit.rest.repos.getContent
        .mockResolvedValueOnce({
          data: [{type: 'file', path: 'test.md', sha: 'test-sha'}]
        })
        .mockResolvedValueOnce({data: '# Test'})
        .mockResolvedValueOnce({data: {sha: 'test-sha', size: 100}})

      const result = await fetchGitHubContent()

      expect(result.success).toBe(true)
      if (result.success) {
        // Should use current date as fallback
        expect(result.data.files[0].lastModified).toBeInstanceOf(Date)
      }
    })

    it('should handle getLastCommitSha errors', async () => {
      const {fetchGitHubContent} = await import('./github-fetcher.ts')

      mockOctokit.rest.repos.listCommits
        .mockResolvedValueOnce({data: [{sha: 'repo-sha'}]})
        .mockRejectedValueOnce(new Error('Commit API error'))

      mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
        data: [{type: 'file', path: 'test.md', sha: 'test-sha'}]
      })

      const result = await fetchGitHubContent()

      expect(result.success).toBe(false)
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error getting last commit: Error: Commit API error'
      )
    })
  })
})
