export interface ServiceResponse<T, E = Error> {
  success: boolean
  error?: E
  data?: T
}

export interface FileInfo {
  readonly path: string
  readonly content: string
  readonly sha: string
  readonly size: number
  readonly lastModified: Date
  readonly type: 'file' | 'directory'
}

export interface GitHubRepoContent {
  readonly files: Map<string, FileInfo>
  readonly lastFetch: Date
  readonly repoSha: string
}

export interface CacheEntry {
  content: GitHubRepoContent
  timestamp: number
}
