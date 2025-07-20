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
import type {ServiceResponse, FileInfo, FileCollection} from '../types.ts'

// Mock dependencies
const mockMkdir = mock(() => Promise.resolve())
const mockBunWrite = mock(() => Promise.resolve())
const mockConsoleLog = mock()
const mockConsoleError = mock()

// Mock node:fs/promises
mock.module('node:fs/promises', () => ({
  mkdir: mockMkdir
}))

// Use spyOn to mock Bun.write
const bunWriteSpy = spyOn(Bun, 'write').mockImplementation(mockBunWrite)

describe('file-scanner', () => {
  const originalEnv = process.env
  const originalConsole = {log: console.log, error: console.error}
  const mockArticlesDir = '/test/articles'

  beforeEach(() => {
    // Reset mocks
    mockMkdir.mockClear()
    mockBunWrite.mockClear()
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()
    bunWriteSpy.mockClear()

    // Mock console methods
    console.log = mockConsoleLog
    console.error = mockConsoleError

    // Set up environment
    process.env = {
      ...originalEnv,
      ARTICLES_DIR: mockArticlesDir
    }

    // Reset mock implementations
    mockMkdir.mockImplementation(() => Promise.resolve())
    mockBunWrite.mockImplementation(() => Promise.resolve())
    bunWriteSpy.mockImplementation(mockBunWrite)
  })

  afterEach(() => {
    // Restore environment
    process.env = originalEnv

    // Restore console
    console.log = originalConsole.log
    console.error = originalConsole.error
  })

  describe('processFilesContent', () => {
    it('should return error when input is not successful', async () => {
      const {processFilesContent} = await import('./file-scanner.ts')

      const inputError = new Error('GitHub API failed')
      const githubContent: ServiceResponse<FileCollection> = err(inputError)

      const result = await processFilesContent(githubContent)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe(inputError)
      }
    })

    it('should process valid markdown files successfully', async () => {
      const {processFilesContent} = await import('./file-scanner.ts')

      const mockFileInfo: FileInfo = {
        sourcePath: 'docs/test.md',
        content: '# Test Content\n\nThis is a test file.',
        path: 'docs/test.md'
      }

      const githubContent: ServiceResponse<FileCollection> = ok({
        files: [mockFileInfo]
      })

      const result = await processFilesContent(githubContent)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files).toHaveLength(1)
        expect(result.data.files[0].sourcePath).toBe('docs/test.md')
        expect(result.data.files[0].localPath).toBe(
          `${mockArticlesDir}/docs/test.md`
        )
        expect(result.data.files[0].type).toBe('markdown')
      }

      // Verify console logs
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Processing 1 files from repository...'
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `Saved: docs/test.md -> ${mockArticlesDir}/docs/test.md`
      )
    })

    it('should handle different markdown file extensions', async () => {
      const {processFilesContent} = await import('./file-scanner.ts')

      const files = [
        {sourcePath: 'test.md', content: '# Test MD', path: 'test.md'},
        {
          sourcePath: 'test.markdown',
          content: '# Test Markdown',
          path: 'test.markdown'
        },
        {sourcePath: 'test.MD', content: '# Test MD Upper', path: 'test.MD'},
        {
          sourcePath: 'test.MARKDOWN',
          content: '# Test Markdown Upper',
          path: 'test.MARKDOWN'
        }
      ]

      const githubContent: ServiceResponse<FileCollection> = ok({files})

      const result = await processFilesContent(githubContent)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files).toHaveLength(4)
        result.data.files.forEach(file => {
          expect(file.type).toBe('markdown')
        })
      }
    })

    it('should mark unsupported file types correctly', async () => {
      const {processFilesContent} = await import('./file-scanner.ts')

      const mockFileInfo: FileInfo = {
        sourcePath: 'docs/test.txt',
        content: 'Some text content',
        path: 'docs/test.txt'
      }

      const githubContent: ServiceResponse<FileCollection> = ok({
        files: [mockFileInfo]
      })

      const result = await processFilesContent(githubContent)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files[0].type).toBe('unsupported')
      }
    })

    it('should skip empty files and log errors', async () => {
      const {processFilesContent} = await import('./file-scanner.ts')

      const files = [
        {sourcePath: 'empty.md', content: '', path: 'empty.md'},
        {
          sourcePath: 'whitespace.md',
          content: '   \n  \t  ',
          path: 'whitespace.md'
        },
        {sourcePath: 'valid.md', content: '# Valid content', path: 'valid.md'}
      ]

      const githubContent: ServiceResponse<FileCollection> = ok({files})

      const result = await processFilesContent(githubContent)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files).toHaveLength(1)
        expect(result.data.files[0].sourcePath).toBe('valid.md')
      }

      // Verify error logs for empty files
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to save file empty.md:',
        expect.any(Error)
      )
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to save file whitespace.md:',
        expect.any(Error)
      )
    })

    it('should handle directory creation errors', async () => {
      const {processFilesContent} = await import('./file-scanner.ts')

      const mockFileInfo: FileInfo = {
        sourcePath: 'docs/test.md',
        content: '# Test Content',
        path: 'docs/test.md'
      }

      const githubContent: ServiceResponse<FileCollection> = ok({
        files: [mockFileInfo]
      })

      const mkdirError = new Error('Permission denied')
      mockMkdir.mockImplementation(() => Promise.reject(mkdirError))

      const result = await processFilesContent(githubContent)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('No files to process')
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to save file docs/test.md:',
        mkdirError
      )
    })

    it('should handle file write errors', async () => {
      const {processFilesContent} = await import('./file-scanner.ts')

      const mockFileInfo: FileInfo = {
        sourcePath: 'docs/test.md',
        content: '# Test Content',
        path: 'docs/test.md'
      }

      const githubContent: ServiceResponse<FileCollection> = ok({
        files: [mockFileInfo]
      })

      const writeError = new Error('Disk full')
      mockBunWrite.mockImplementation(() => Promise.reject(writeError))
      bunWriteSpy.mockImplementation(() => Promise.reject(writeError))

      const result = await processFilesContent(githubContent)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('No files to process')
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to save file docs/test.md:',
        writeError
      )
    })

    it('should process multiple files with mixed success/failure', async () => {
      const {processFilesContent} = await import('./file-scanner.ts')

      const files = [
        {
          sourcePath: 'success1.md',
          content: '# Success 1',
          path: 'success1.md'
        },
        {sourcePath: 'empty.md', content: '', path: 'empty.md'},
        {sourcePath: 'success2.md', content: '# Success 2', path: 'success2.md'}
      ]

      const githubContent: ServiceResponse<FileCollection> = ok({files})

      const result = await processFilesContent(githubContent)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files).toHaveLength(2)
        expect(result.data.files[0].sourcePath).toBe('success1.md')
        expect(result.data.files[1].sourcePath).toBe('success2.md')
      }

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Processing 3 files from repository...'
      )
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to save file empty.md:',
        expect.any(Error)
      )
    })

    it('should return error when no files are successfully processed', async () => {
      const {processFilesContent} = await import('./file-scanner.ts')

      const files = [
        {sourcePath: 'empty1.md', content: '', path: 'empty1.md'},
        {sourcePath: 'empty2.md', content: '   ', path: 'empty2.md'}
      ]

      const githubContent: ServiceResponse<FileCollection> = ok({files})

      const result = await processFilesContent(githubContent)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('No files to process')
      }
    })

    it('should handle empty file collection', async () => {
      const {processFilesContent} = await import('./file-scanner.ts')

      const githubContent: ServiceResponse<FileCollection> = ok({
        files: []
      })

      const result = await processFilesContent(githubContent)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('No files to process')
      }

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Processing 0 files from repository...'
      )
    })

    it('should create correct local paths using ARTICLES_DIR', async () => {
      const {processFilesContent} = await import('./file-scanner.ts')

      const mockFileInfo: FileInfo = {
        sourcePath: 'nested/folder/test.md',
        content: '# Test Content',
        path: 'nested/folder/test.md'
      }

      const githubContent: ServiceResponse<FileCollection> = ok({
        files: [mockFileInfo]
      })

      const result = await processFilesContent(githubContent)

      expect(result.success).toBe(true)
      if (result.success) {
        const expectedLocalPath = `${mockArticlesDir}/nested/folder/test.md`
        expect(result.data.files[0].localPath).toBe(expectedLocalPath)
      }

      // Verify mkdir was called with correct directory
      expect(mockMkdir).toHaveBeenCalledWith(
        `${mockArticlesDir}/nested/folder`,
        {recursive: true}
      )
    })

    it('should preserve original file properties', async () => {
      const {processFilesContent} = await import('./file-scanner.ts')

      const mockFileInfo: FileInfo = {
        sourcePath: 'docs/test.md',
        content: '# Test Content',
        path: 'docs/test.md',
        // Add any other properties that might exist
        customProperty: 'test value'
      } as any

      const githubContent: ServiceResponse<FileCollection> = ok({
        files: [mockFileInfo]
      })

      const result = await processFilesContent(githubContent)

      expect(result.success).toBe(true)
      if (result.success) {
        const processedFile = result.data.files[0]
        expect(processedFile.sourcePath).toBe(mockFileInfo.sourcePath)
        expect(processedFile.content).toBe(mockFileInfo.content)
        expect(processedFile.path).toBe(mockFileInfo.path)
        expect((processedFile as any).customProperty).toBe('test value')
        expect(processedFile.localPath).toBeDefined()
        expect(processedFile.type).toBeDefined()
      }
    })
  })
})
