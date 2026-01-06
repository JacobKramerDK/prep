export interface VaultFile {
  path: string
  name: string
  title: string
  content: string
  frontmatter: Record<string, any>
  tags: string[]
  created: Date
  modified: Date
  size: number
}

export interface VaultIndex {
  files: VaultFile[]
  totalFiles: number
  lastIndexed: Date
  vaultPath: string
  errors?: Array<{
    filePath: string
    error: string
  }>
}

export interface SearchResult {
  file: VaultFile
  matches: Array<{
    field: 'title' | 'content' | 'tags'
    snippet: string
    position: number
  }>
  score: number
}
