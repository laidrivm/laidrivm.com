import type {ReactNode} from 'preact/compat'

export interface Link {
  text: string
  address: string
}

export type Links = Link[]

export interface Index {
  path: string
  links: Links
  language: SupportedLanguage
}

export type Indexes = Index[]

export type SupportedLanguage = 'en' | 'ru' | 'es' | 'fr'

export interface ArticleProcessingConfig {
  articlesPath: string
  publicPath: string
  indexes: Indexes
  pages: PageEntry[]
  depth: number
}

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
