import {describe, it, expect, beforeEach, spyOn, afterEach} from 'bun:test'

import type {FileInfo, FileType} from '../types'

import {storeInCache, isCacheValid, invalidateCache} from './cache.ts'

// Mock FileInfo objects for testing
const mockFileInfo1: FileInfo = {
  sourcePath: '/src/components/Button.tsx',
  localPath: '/tmp/repo/src/components/Button.tsx',
  content:
    'import React from "react";\n\nexport const Button = () => <button>Click me</button>;',
  sha: 'abc123def456',
  size: 1024,
  lastModified: new Date('2024-01-15T10:30:00Z'),
  type: 'file' as FileType
}

const mockFileInfo2: FileInfo = {
  sourcePath: '/src/utils/helpers.ts',
  localPath: '/tmp/repo/src/utils/helpers.ts',
  content:
    'export function formatDate(date: Date): string {\n  return date.toISOString();\n}',
  sha: '789xyz012abc',
  size: 512,
  lastModified: new Date('2024-01-20T14:45:00Z'),
  type: 'file' as FileType
}

const mockFileInfo3: FileInfo = {
  sourcePath: '/src/components/Modal.tsx',
  localPath: '/tmp/repo/src/components/Modal.tsx',
  content:
    'import React from "react";\n\nexport const Modal = ({ children }: { children: React.ReactNode }) => (\n  <div className="modal">{children}</div>\n);',
  sha: 'def456ghi789',
  size: 2048,
  lastModified: new Date('2024-01-25T09:15:00Z'),
  type: 'file' as FileType
}

describe('Cache Module', () => {
  let consoleSpy: any

  beforeEach(() => {
    // Clear the cache before each test by invalidating all known paths
    invalidateCache(mockFileInfo1.sourcePath)
    invalidateCache(mockFileInfo2.sourcePath)
    invalidateCache(mockFileInfo3.sourcePath)

    // Spy on console.log to test logging behavior
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('storeInCache', () => {
    it('should store a file in the cache', () => {
      storeInCache(mockFileInfo1)

      // Verify the file was cached by checking if cache is valid
      expect(isCacheValid(mockFileInfo1.sha, mockFileInfo1.sourcePath)).toBe(
        true
      )
    })

    it('should log when storing a file', () => {
      storeInCache(mockFileInfo1)

      expect(consoleSpy).toHaveBeenCalledWith(
        `Cached file ${mockFileInfo1.sourcePath} with SHA ${mockFileInfo1.sha}`
      )
    })

    it('should overwrite existing cache entries', () => {
      // Store initial file
      storeInCache(mockFileInfo1)
      expect(isCacheValid(mockFileInfo1.sha, mockFileInfo1.sourcePath)).toBe(
        true
      )

      // Create updated version with same path but different SHA
      const updatedFile: FileInfo = {
        ...mockFileInfo1,
        sha: 'updated123sha456',
        lastModified: new Date('2024-02-01T12:00:00Z')
      }

      storeInCache(updatedFile)

      // Old SHA should no longer be valid
      expect(isCacheValid(mockFileInfo1.sha, mockFileInfo1.sourcePath)).toBe(
        false
      )
      // New SHA should be valid
      expect(isCacheValid(updatedFile.sha, mockFileInfo1.sourcePath)).toBe(true)
    })

    it('should handle multiple files with different paths', () => {
      storeInCache(mockFileInfo1)
      storeInCache(mockFileInfo2)

      expect(isCacheValid(mockFileInfo1.sha, mockFileInfo1.sourcePath)).toBe(
        true
      )
      expect(isCacheValid(mockFileInfo2.sha, mockFileInfo2.sourcePath)).toBe(
        true
      )
    })
  })

  describe('isCacheValid', () => {
    it('should return true when SHA matches cached file', () => {
      storeInCache(mockFileInfo1)

      const isValid = isCacheValid(mockFileInfo1.sha, mockFileInfo1.sourcePath)
      expect(isValid).toBe(true)
    })

    it('should return false when SHA does not match cached file', () => {
      storeInCache(mockFileInfo1)

      const isValid = isCacheValid('different-sha', mockFileInfo1.sourcePath)
      expect(isValid).toBe(false)
    })

    it('should return false when file is not in cache', () => {
      const isValid = isCacheValid('any-sha', '/non/existent/path.ts')
      expect(isValid).toBe(false)
    })

    it('should return false when file was invalidated', () => {
      storeInCache(mockFileInfo1)
      expect(isCacheValid(mockFileInfo1.sha, mockFileInfo1.sourcePath)).toBe(
        true
      )

      invalidateCache(mockFileInfo1.sourcePath)
      expect(isCacheValid(mockFileInfo1.sha, mockFileInfo1.sourcePath)).toBe(
        false
      )
    })

    it('should handle empty strings', () => {
      expect(isCacheValid('', '')).toBe(false)
      expect(isCacheValid('some-sha', '')).toBe(false)
      expect(isCacheValid('', '/some/path.ts')).toBe(false)
    })
  })

  describe('invalidateCache', () => {
    it('should invalidate cached file and log', () => {
      storeInCache(mockFileInfo1)
      expect(isCacheValid(mockFileInfo1.sha, mockFileInfo1.sourcePath)).toBe(
        true
      )

      invalidateCache(mockFileInfo1.sourcePath)

      expect(isCacheValid(mockFileInfo1.sha, mockFileInfo1.sourcePath)).toBe(
        false
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        `Invalidated cache for ${mockFileInfo1.sourcePath}`
      )
    })

    it('should not log when invalidating non-existent cache entry', () => {
      // Clear previous console calls
      consoleSpy.mockClear()

      invalidateCache('/non/existent/path.ts')

      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should only invalidate the specified path', () => {
      storeInCache(mockFileInfo1)
      storeInCache(mockFileInfo2)

      invalidateCache(mockFileInfo1.sourcePath)

      expect(isCacheValid(mockFileInfo1.sha, mockFileInfo1.sourcePath)).toBe(
        false
      )
      expect(isCacheValid(mockFileInfo2.sha, mockFileInfo2.sourcePath)).toBe(
        true
      )
    })

    it('should handle empty path', () => {
      expect(() => invalidateCache('')).not.toThrow()
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complete cache lifecycle', () => {
      // Store multiple files
      storeInCache(mockFileInfo1)
      storeInCache(mockFileInfo2)
      storeInCache(mockFileInfo3)

      // Verify all are cached
      expect(isCacheValid(mockFileInfo1.sha, mockFileInfo1.sourcePath)).toBe(
        true
      )
      expect(isCacheValid(mockFileInfo2.sha, mockFileInfo2.sourcePath)).toBe(
        true
      )
      expect(isCacheValid(mockFileInfo3.sha, mockFileInfo3.sourcePath)).toBe(
        true
      )

      // Invalidate one
      invalidateCache(mockFileInfo2.sourcePath)

      // Verify selective invalidation
      expect(isCacheValid(mockFileInfo1.sha, mockFileInfo1.sourcePath)).toBe(
        true
      )
      expect(isCacheValid(mockFileInfo2.sha, mockFileInfo2.sourcePath)).toBe(
        false
      )
      expect(isCacheValid(mockFileInfo3.sha, mockFileInfo3.sourcePath)).toBe(
        true
      )

      // Update one with new SHA
      const updatedFile: FileInfo = {
        ...mockFileInfo1,
        sha: 'brand-new-sha',
        lastModified: new Date('2024-02-10T16:30:00Z')
      }
      storeInCache(updatedFile)

      // Verify update worked
      expect(isCacheValid(mockFileInfo1.sha, mockFileInfo1.sourcePath)).toBe(
        false
      )
      expect(isCacheValid(updatedFile.sha, mockFileInfo1.sourcePath)).toBe(true)
    })

    it('should handle rapid cache operations', () => {
      const testFile: FileInfo = {
        sourcePath: '/test/rapid.ts',
        localPath: '/tmp/repo/test/rapid.ts',
        content: 'export const test = "initial";',
        sha: 'initial-sha',
        size: 256,
        lastModified: new Date('2024-01-01T00:00:00Z'),
        type: 'file' as FileType
      }

      // Rapid store/invalidate/store cycle
      storeInCache(testFile)
      expect(isCacheValid(testFile.sha, testFile.sourcePath)).toBe(true)

      invalidateCache(testFile.sourcePath)
      expect(isCacheValid(testFile.sha, testFile.sourcePath)).toBe(false)

      const updatedFile: FileInfo = {
        ...testFile,
        sha: 'updated-sha',
        content: 'export const test = "updated";',
        lastModified: new Date('2024-01-02T12:00:00Z')
      }
      storeInCache(updatedFile)
      expect(isCacheValid(updatedFile.sha, testFile.sourcePath)).toBe(true)
      expect(isCacheValid(testFile.sha, testFile.sourcePath)).toBe(false)
    })
  })
})
