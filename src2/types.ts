import type {TokensList} from 'marked'

export interface ServiceResponse<T, E = Error> {
  success: boolean
  error?: E
  data?: T
}

export type FileType = 'markdown' | 'unsupported'

export type GenerateType = 'new' | 'all' | 'initial' | 'skip' | 'local'

export interface FileInfo {
  sourcePath: string // Original GitHub path
  localPath?: string // Local filesystem path
  content?: string | TokensList
  frontmatter?: Object
  sha: string | null
  size: number
  lastModified: Date
  type: FileType
}

export interface FileCollection {
  readonly files: FileInfo[]
  readonly lastFetch: Date
  readonly repoSha: string
  readonly mode: GenerateType
}

export interface CacheEntry {
  file: FileInfo
  sha: number
}

export interface FileMeta {
  sha: string
  size: number
  lastModified: Date
}

export interface MarkdownContent {
  frontmatter: Object
  tokens: TokensList
}
