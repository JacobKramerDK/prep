import { VaultManager } from '../../src/main/services/vault-manager'
import * as fs from 'fs/promises'
import matter from 'gray-matter'

jest.mock('fs/promises')
jest.mock('gray-matter')
jest.mock('chokidar', () => ({
  watch: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    close: jest.fn()
  }))
}))

const mockFs = fs as jest.Mocked<typeof fs>
const mockMatter = matter as jest.MockedFunction<typeof matter>

describe('VaultManager', () => {
  let vaultManager: VaultManager
  
  beforeEach(() => {
    vaultManager = new VaultManager()
    jest.clearAllMocks()
  })

  describe('scanVault', () => {
    it('should scan directory and parse markdown files', async () => {
      // Mock fs.stat to return directory stats
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date('2023-01-01'),
        mtime: new Date('2023-01-02'),
        size: 1024
      } as any)

      // Mock fs.readdir to return test files
      mockFs.readdir.mockResolvedValue([
        { name: 'note1.md', isFile: () => true },
        { name: 'note2.md', isFile: () => true },
        { name: 'readme.txt', isFile: () => true } // Should be ignored
      ] as any)

      // Mock fs.readFile for markdown content
      mockFs.readFile.mockResolvedValue('---\ntitle: Test Note\ntags: [test]\n---\n\n# Test Content')

      // Mock matter() to return parsed frontmatter
      mockMatter.mockReturnValue({
        data: { title: 'Test Note', tags: ['test'] },
        content: '# Test Content',
        orig: '',
        language: '',
        matter: '',
        stringify: jest.fn()
      } as any)

      const result = await vaultManager.scanVault('/test/vault')

      expect(result.files).toHaveLength(2) // Only .md files
      expect(result.totalFiles).toBe(2)
      expect(result.vaultPath).toBe('/test/vault')
      expect(result.files[0].title).toBe('Test Note')
      expect(result.files[0].tags).toEqual(['test'])
    })
    
    it('should handle files without frontmatter', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date(),
        mtime: new Date(),
        size: 512
      } as any)

      mockFs.readdir.mockResolvedValue([
        { name: 'simple.md', isFile: () => true }
      ] as any)

      mockFs.readFile.mockResolvedValue('# Simple Note\n\nJust content, no frontmatter.')

      mockMatter.mockReturnValue({
        data: {},
        content: '# Simple Note\n\nJust content, no frontmatter.',
        orig: '',
        language: '',
        matter: '',
        stringify: jest.fn()
      } as any)

      const result = await vaultManager.scanVault('/test/vault')

      expect(result.files[0].title).toBe('simple') // Should use filename
      expect(result.files[0].tags).toEqual([])
      expect(result.files[0].frontmatter).toEqual({})
    })
    
    it('should skip non-markdown files', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date(),
        mtime: new Date(),
        size: 1024
      } as any)

      mockFs.readdir.mockResolvedValue([
        { name: 'document.pdf', isFile: () => true },
        { name: 'image.png', isFile: () => true },
        { name: 'note.md', isFile: () => true }
      ] as any)

      mockFs.readFile.mockResolvedValue('# Test Note')
      mockMatter.mockReturnValue({
        data: {},
        content: '# Test Note',
        orig: '',
        language: '',
        matter: '',
        stringify: jest.fn()
      } as any)

      const result = await vaultManager.scanVault('/test/vault')

      expect(result.files).toHaveLength(1) // Only the .md file
      expect(result.files[0].name).toBe('note.md')
    })

    it('should throw error for invalid path', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false
      } as any)

      await expect(vaultManager.scanVault('/invalid/path'))
        .rejects.toThrow('Selected path is not a directory')
    })
  })

  describe('searchFiles', () => {
    beforeEach(async () => {
      // Set up a mock vault index
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date(),
        mtime: new Date(),
        size: 1024
      } as any)

      mockFs.readdir.mockResolvedValue([
        { name: 'meeting-notes.md', isFile: () => true },
        { name: 'project-plan.md', isFile: () => true }
      ] as any)

      mockFs.readFile
        .mockResolvedValueOnce('---\ntitle: Meeting Notes\ntags: [meeting, team]\n---\n\n# Meeting Notes\n\nDiscussed project timeline.')
        .mockResolvedValueOnce('---\ntitle: Project Planning\ntags: [project, planning]\n---\n\n# Project Plan\n\nDetailed project roadmap.')

      mockMatter
        .mockReturnValueOnce({
          data: { title: 'Meeting Notes', tags: ['meeting', 'team'] },
          content: '# Meeting Notes\n\nDiscussed project timeline.',
          orig: '',
          language: '',
          matter: '',
          stringify: jest.fn()
        } as any)
        .mockReturnValueOnce({
          data: { title: 'Project Planning', tags: ['project', 'planning'] },
          content: '# Project Plan\n\nDetailed project roadmap.',
          orig: '',
          language: '',
          matter: '',
          stringify: jest.fn()
        } as any)

      await vaultManager.scanVault('/test/vault')
    })
    
    it('should search by title', async () => {
      const results = await vaultManager.searchFiles('Meeting')

      expect(results).toHaveLength(1)
      expect(results[0].file.title).toBe('Meeting Notes')
      expect(results[0].matches[0].field).toBe('title')
      expect(results[0].score).toBeGreaterThan(0)
    })
    
    it('should search by content', async () => {
      const results = await vaultManager.searchFiles('timeline')

      expect(results).toHaveLength(1)
      expect(results[0].file.title).toBe('Meeting Notes')
      expect(results[0].matches[0].field).toBe('content')
    })
    
    it('should search by tags', async () => {
      const results = await vaultManager.searchFiles('project')

      expect(results).toHaveLength(2) // Both files have 'project' tag
      expect(results[0].matches.some(m => m.field === 'tags')).toBe(true)
    })

    it('should return empty array for empty query', async () => {
      const results = await vaultManager.searchFiles('')

      expect(results).toHaveLength(0)
    })

    it('should throw error when no vault is indexed', async () => {
      const newVaultManager = new VaultManager()

      await expect(newVaultManager.searchFiles('test'))
        .rejects.toThrow('No vault indexed. Please scan a vault first.')
    })
  })

  describe('readFile', () => {
    it('should read file content', async () => {
      // First scan a vault to set vaultPath
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date(),
        mtime: new Date(),
        size: 1024
      } as any)

      mockFs.readdir.mockResolvedValue([])
      await vaultManager.scanVault('/test/vault')

      // Mock file reading
      mockFs.readFile.mockResolvedValue('# Test Content\n\nThis is a test file.')

      const content = await vaultManager.readFile('/test/vault/note.md')

      expect(content).toBe('# Test Content\n\nThis is a test file.')
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/vault/note.md', 'utf-8')
    })

    it('should throw error for files outside vault', async () => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        birthtime: new Date(),
        mtime: new Date(),
        size: 1024
      } as any)

      mockFs.readdir.mockResolvedValue([])
      await vaultManager.scanVault('/test/vault')

      await expect(vaultManager.readFile('/other/path/file.md'))
        .rejects.toThrow('Access denied: File is outside vault directory')
    })

    it('should throw error when no vault is selected', async () => {
      await expect(vaultManager.readFile('/any/file.md'))
        .rejects.toThrow('No vault selected')
    })
  })
})
