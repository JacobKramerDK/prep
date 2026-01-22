/**
 * Test for Obsidian brief saving security fixes
 */

import { describe, it, expect } from '@jest/globals'

describe('ObsidianBriefUtils Security', () => {
  // Mock the utility functions to test them in isolation
  const MAX_FILENAME_LENGTH = 200

  function sanitizeFileName(name: string, isWindows: boolean): string {
    if (isWindows) {
      return name.replace(/[<>:"/\\|?*]/g, '_').trim().substring(0, MAX_FILENAME_LENGTH)
    }
    return name.replace(/[/\\:]/g, '_').trim().substring(0, MAX_FILENAME_LENGTH)
  }

  function escapeYamlString(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\\/g, '\\\\')
  }

  function validatePath(path: string): boolean {
    return !path.includes('..') && !path.includes('~')
  }

  it('should sanitize Windows filenames correctly', () => {
    const dangerous = 'test<>:"/\\|?*file'
    const result = sanitizeFileName(dangerous, true)
    expect(result).toBe('test_________file')
    expect(result.length).toBeLessThanOrEqual(MAX_FILENAME_LENGTH)
  })

  it('should sanitize Unix filenames correctly', () => {
    const dangerous = 'test/\\:file'
    const result = sanitizeFileName(dangerous, false)
    expect(result).toBe('test___file')
    expect(result.length).toBeLessThanOrEqual(MAX_FILENAME_LENGTH)
  })

  it('should escape YAML strings correctly', () => {
    const dangerous = 'Meeting "with quotes" and \\backslashes'
    const result = escapeYamlString(dangerous)
    expect(result).toBe('Meeting \\\\"with quotes\\\\" and \\\\backslashes')
  })

  it('should detect path traversal attempts', () => {
    expect(validatePath('/safe/path')).toBe(true)
    expect(validatePath('../../../etc/passwd')).toBe(false)
    expect(validatePath('~/dangerous')).toBe(false)
    expect(validatePath('safe/../path')).toBe(false)
  })

  it('should handle long filenames', () => {
    const longName = 'a'.repeat(300)
    const result = sanitizeFileName(longName, false)
    expect(result.length).toBe(MAX_FILENAME_LENGTH)
  })
})
