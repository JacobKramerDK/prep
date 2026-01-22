export interface VaultIndexingProgress {
  stage: 'scanning' | 'indexing' | 'complete' | 'error'
  current: number
  total: number
  currentFile?: string
  error?: string
}

export interface VaultIndexingStatus {
  isIndexing: boolean
  progress?: VaultIndexingProgress
}
