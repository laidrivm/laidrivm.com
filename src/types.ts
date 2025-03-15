import type {ReactNode} from 'preact/compat'

export interface Link {
  text: string
  address: string
}

export type Links = Link[]

export type SupportedLanguage = 'en' | 'ru' | 'es' | 'fr'

export interface PageEntry {
  path: string
  lastmod: string
  priority: number
}

export interface PageRenderOptions {
  address: string
  title: string
  description: string
  content: ReactNode
  language: SupportedLanguage
  includeArrow?: boolean
  image?: string
}

export type FileNodeType = 'folder' | 'article'

export interface FileNode {
  name: string
  type: FileNodeType
  edited: string // ISO date string
  children?: FileNode[]
}
