import {test, expect, describe, beforeEach, afterEach, mock} from 'bun:test'

import {generate} from './generator.ts'

// Mock the utils module
const mockAsyncPipe = mock()

// Mock the github-fetcher module
const mockFetchGitHubContent = mock()

// Mock console methods
const originalConsole = {
  log: console.log
}

let consoleLogs: string[] = []

beforeEach(() => {
  // Reset all mocks
  mockAsyncPipe.mockReset()
  mockFetchGitHubContent.mockReset()

  // Reset console captures
  consoleLogs = []

  // Mock console methods
  console.log = (...args: any[]) => {
    consoleLogs.push(args.join(' '))
  }

  // Set up default mock implementations
  mockAsyncPipe.mockImplementation(fn => {
    return async (input: any) => {
      return await fn(input)
    }
  })
})

afterEach(() => {
  // Restore console methods
  console.log = originalConsole.log
})

// Mock modules at the top level
mock.module('../utils.ts', () => ({
  asyncPipe: mockAsyncPipe
}))

mock.module('./github-fetcher.ts', () => ({
  fetchGitHubContent: mockFetchGitHubContent
}))

describe('generate', () => {
  test('should successfully complete generation process', async () => {
    const mockResult = {
      success: true,
      data: {files: new Map(), lastFetch: new Date(), repoSha: 'test-sha'}
    }
    mockFetchGitHubContent.mockResolvedValue(mockResult)

    const result = await generate()

    expect(result.success).toBe(true)
    expect(result.data).toEqual(mockResult)
    expect(consoleLogs).toContain('Starting site generation...')
    expect(
      consoleLogs.some(
        log =>
          log.includes('Site generation completed in') && log.includes('ms')
      )
    ).toBe(true)
  })

  test('should handle errors and return failure response', async () => {
    const mockError = new Error('Pipeline failed')
    mockFetchGitHubContent.mockRejectedValue(mockError)

    const result = await generate()

    expect(result.success).toBe(false)
    expect(result.error).toBe(mockError)
    expect(consoleLogs).toContain('Starting site generation...')
    expect(
      consoleLogs.some(log => log.includes('Site generation completed'))
    ).toBe(false)
  })

  test('should measure and log build time accurately', async () => {
    const mockResult = {success: true, data: {}}

    // Add controlled delay to measure timing
    mockFetchGitHubContent.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      return mockResult
    })

    const startTime = Date.now()
    await generate()
    const endTime = Date.now()

    const completionLog = consoleLogs.find(
      log => log.includes('Site generation completed in') && log.includes('ms')
    )
    expect(completionLog).toBeDefined()

    const timeMatch = completionLog?.match(/completed in (\d+)ms/)
    expect(timeMatch).toBeTruthy()

    if (timeMatch) {
      const reportedTime = parseInt(timeMatch[1])
      const actualTime = endTime - startTime

      // Reported time should be close to actual time (within 20ms tolerance)
      expect(Math.abs(reportedTime - actualTime)).toBeLessThan(20)
      expect(reportedTime).toBeGreaterThan(90) // At least 90ms due to delay
    }
  })

  test('should call asyncPipe with correct parameters', async () => {
    const mockResult = {success: true, data: {}}
    mockFetchGitHubContent.mockResolvedValue(mockResult)

    await generate()

    expect(mockAsyncPipe).toHaveBeenCalledWith(mockFetchGitHubContent)
    expect(mockAsyncPipe).toHaveBeenCalledTimes(1)
  })

  test('should pass undefined to pipeline', async () => {
    const mockResult = {success: true, data: {}}
    mockFetchGitHubContent.mockResolvedValue(mockResult)

    await generate()

    expect(mockFetchGitHubContent).toHaveBeenCalledWith(undefined)
    expect(mockFetchGitHubContent).toHaveBeenCalledTimes(1)
  })

  test('should handle asyncPipe creation errors', async () => {
    const mockError = new Error('AsyncPipe creation failed')
    mockAsyncPipe.mockImplementation(() => {
      throw mockError
    })

    const result = await generate()

    expect(result.success).toBe(false)
    expect(result.error).toBe(mockError)
    expect(consoleLogs).toContain('Starting site generation...')
    expect(
      consoleLogs.some(log => log.includes('Site generation completed'))
    ).toBe(false)
  })

  test('should handle different return value types', async () => {
    const mockResult = {
      success: true,
      data: {
        files: new Map([['test.md', {path: 'test.md', content: 'test'}]]),
        lastFetch: new Date(),
        repoSha: 'abc123'
      }
    }
    mockFetchGitHubContent.mockResolvedValue(mockResult)

    const result = await generate()

    expect(result.success).toBe(true)
    expect(result.data).toEqual(mockResult)
    expect(typeof result.data).toBe('object')
  })

  test('should handle null/undefined return values', async () => {
    mockFetchGitHubContent.mockResolvedValue(null)

    const result = await generate()

    expect(result.success).toBe(true)
    expect(result.data).toBe(null)
  })

  test('should handle zero build time', async () => {
    const mockResult = {success: true, data: {}}
    mockFetchGitHubContent.mockResolvedValue(mockResult)

    // Mock Date.now to return same value (zero build time)
    const originalDateNow = Date.now
    const fixedTime = 1000000

    Date.now = mock(() => fixedTime)

    const result = await generate()

    expect(result.success).toBe(true)
    expect(
      consoleLogs.some(log => log.includes('Site generation completed in 0ms'))
    ).toBe(true)

    // Restore Date.now
    Date.now = originalDateNow
  })

  test('should maintain proper error object structure', async () => {
    const mockError = new Error('Test error')
    mockError.stack = 'Error stack trace'
    mockFetchGitHubContent.mockRejectedValue(mockError)

    const result = await generate()

    expect(result.success).toBe(false)
    expect(result.error).toBe(mockError)
    expect(result.error.message).toBe('Test error')
    expect(result.error.stack).toBe('Error stack trace')
    expect('data' in result).toBe(false)
  })

  test('should handle async pipeline correctly', async () => {
    const mockResult = {success: true, data: {processed: true}}

    // Verify async behavior
    let asyncCallCompleted = false
    mockFetchGitHubContent.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      asyncCallCompleted = true
      return mockResult
    })

    expect(asyncCallCompleted).toBe(false)

    const result = await generate()

    expect(asyncCallCompleted).toBe(true)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(mockResult)
  })

  test('should handle synchronous errors in pipeline', async () => {
    const mockError = new Error('Sync error')
    mockAsyncPipe.mockImplementation(() => {
      return () => {
        throw mockError
      }
    })

    const result = await generate()

    expect(result.success).toBe(false)
    expect(result.error).toBe(mockError)
  })

  test('should log messages in correct order', async () => {
    const mockResult = {success: true, data: {}}
    mockFetchGitHubContent.mockResolvedValue(mockResult)

    await generate()

    expect(consoleLogs[0]).toBe('Starting site generation...')
    expect(consoleLogs[1]).toMatch(/Site generation completed in \d+ms/)
    expect(consoleLogs).toHaveLength(2)
  })

  test('should handle large build times correctly', async () => {
    const mockResult = {success: true, data: {}}

    // Mock a longer delay
    mockFetchGitHubContent.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 200))
      return mockResult
    })

    const result = await generate()

    expect(result.success).toBe(true)

    const completionLog = consoleLogs.find(
      log => log.includes('Site generation completed in') && log.includes('ms')
    )
    const timeMatch = completionLog?.match(/completed in (\d+)ms/)

    if (timeMatch) {
      const reportedTime = parseInt(timeMatch[1])
      expect(reportedTime).toBeGreaterThan(190) // Should be at least 190ms
      expect(reportedTime).toBeLessThan(300) // But not too much more
    }
  })
})
