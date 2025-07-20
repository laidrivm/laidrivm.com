import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn
} from 'bun:test'

import {ok, err} from '../utils.ts'
import type {ServiceResponse, FileCollection} from '../types.ts'

// Mock dependencies
const mockFetchGitHubContent = mock()
const mockProcessFilesContent = mock()
const mockConsoleLog = mock()

// Mock the imported modules
mock.module('./github-fetcher.ts', () => ({
  fetchGitHubContent: mockFetchGitHubContent
}))

mock.module('./file-scanner.ts', () => ({
  processFilesContent: mockProcessFilesContent
}))

describe('generator', () => {
  const originalConsole = {log: console.log}
  let dateNowSpy: any

  beforeEach(() => {
    // Reset mocks
    mockFetchGitHubContent.mockClear()
    mockProcessFilesContent.mockClear()
    mockConsoleLog.mockClear()

    // Mock console.log
    console.log = mockConsoleLog

    // Mock Date.now for timing tests
    dateNowSpy = spyOn(Date, 'now')
      .mockReturnValueOnce(1000) // Start time
      .mockReturnValueOnce(1500) // End time (500ms later)
  })

  afterEach(() => {
    // Restore console
    console.log = originalConsole.log

    // Restore Date.now
    dateNowSpy.mockRestore()
  })

  describe('generate', () => {
    it('should complete successful generation pipeline', async () => {
      const {generate} = await import('./generator.ts')

      const mockGitHubResponse: ServiceResponse<FileCollection> = ok({
        files: [
          {
            sourcePath: 'test.md',
            sha: 'abc123',
            size: 100,
            lastModified: new Date(),
            type: 'file' as const
          }
        ],
        lastFetch: new Date(),
        repoSha: 'repo-sha-123'
      })

      const mockProcessedResponse: ServiceResponse<FileCollection> = ok({
        files: [
          {
            sourcePath: 'test.md',
            localPath: '/tmp/test.md',
            sha: 'abc123',
            size: 100,
            lastModified: new Date(),
            type: 'markdown' as const
          }
        ],
        lastFetch: new Date(),
        repoSha: 'repo-sha-123'
      })

      mockFetchGitHubContent.mockResolvedValue(mockGitHubResponse)
      mockProcessFilesContent.mockResolvedValue(mockProcessedResponse)

      const result = await generate()

      expect(result.success).toBe(true)
      expect(mockFetchGitHubContent).toHaveBeenCalledWith(undefined)
      expect(mockProcessFilesContent).toHaveBeenCalledWith(mockGitHubResponse)

      expect(mockConsoleLog).toHaveBeenCalledWith('Starting site generation...')
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Site generation completed in 500ms'
      )
    })

    it('should handle GitHub fetcher failure', async () => {
      const {generate} = await import('./generator.ts')

      const fetchError = new Error('GitHub API failed')
      const mockErrorResponse: ServiceResponse<FileCollection> = err(fetchError)

      mockFetchGitHubContent.mockResolvedValue(mockErrorResponse)

      const result = await generate()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe(fetchError)
      }

      expect(mockFetchGitHubContent).toHaveBeenCalledWith(undefined)
      expect(mockProcessFilesContent).not.toHaveBeenCalled()

      expect(mockConsoleLog).toHaveBeenCalledWith('Starting site generation...')
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Site generation failed after 500ms'
      )
    })

    it('should handle file processing failure', async () => {
      const {generate} = await import('./generator.ts')

      const mockGitHubResponse: ServiceResponse<FileCollection> = ok({
        files: [
          {
            sourcePath: 'test.md',
            sha: 'abc123',
            size: 100,
            lastModified: new Date(),
            type: 'file' as const
          }
        ],
        lastFetch: new Date(),
        repoSha: 'repo-sha-123'
      })

      const processingError = new Error('File processing failed')
      const mockErrorResponse: ServiceResponse<FileCollection> =
        err(processingError)

      mockFetchGitHubContent.mockResolvedValue(mockGitHubResponse)
      mockProcessFilesContent.mockResolvedValue(mockErrorResponse)

      const result = await generate()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe(processingError)
      }

      expect(mockConsoleLog).toHaveBeenCalledWith('Starting site generation...')
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Site generation failed after 500ms'
      )
    })

    it('should measure execution time correctly', async () => {
      const {generate} = await import('./generator.ts')

      // Set up different timing
      dateNowSpy.mockRestore()
      dateNowSpy = spyOn(Date, 'now')
        .mockReturnValueOnce(2000) // Start time
        .mockReturnValueOnce(4250) // End time (2250ms later)

      const mockResponse: ServiceResponse<FileCollection> = ok({
        files: [],
        lastFetch: new Date(),
        repoSha: 'repo-sha-123'
      })

      mockFetchGitHubContent.mockResolvedValue(mockResponse)
      mockProcessFilesContent.mockResolvedValue(mockResponse)

      await generate()

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Site generation completed in 2250ms'
      )
    })
  })
})
