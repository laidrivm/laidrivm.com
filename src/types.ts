export type SupportedLanguage = 'en' | 'ru' | 'es' | 'fr'

export interface Link {
  text: string
  address: string
}

export type Links = Link[]

/**
 * File or directory node in the content tree
 */
export interface FileNode {
  /** Base name without extension */
  name: string
  /** Node type: folder, article or misc asset */
  type: 'folder' | 'article' | 'misc'
  /** ISO date string of last modification time */
  edited: string
  /** ISO date string of creation time */
  created: string
  /** Child nodes for folders */
  children?: FileNode[]
}

/**
 * Page metadata for sitemap generation
 */
export interface PageEntry {
  /** Full path to the page */
  path: string
  /** Last modification date in ISO format */
  lastmod: string
  /** Priority value for search engines (0.0-1.0) */
  priority: number
}

/**
 * Page rendering configuration
 */
export interface PageRenderOptions {
  /** Canonical URL for the page */
  address: string
  /** Page title */
  title: string
  /** Meta description */
  description: string
  /** Page HTML content */
  content: string | JSX.Element
  /** Page language code */
  lang: SupportedLanguage
  /** ISO date string of last modification time */
  time: string
  /** Whether to show back arrow navigation */
  includeArrow?: boolean
  /** Open Graph image URL */
  image?: string
}

export interface RepoConfig {
  owner: string
  repo: string
}

/**
 * Environment configuration
 */
export interface EnvConfig {
  /** HTTP server port */
  PORT: string
  /** Site domain or address */
  ADDRESS: string
  /** Content source (URL or 'local') */
  SOURCE: string
  /** GitHub API token */
  GITHUB_TOKEN: string
  /** Directory for storing content */
  ARTICLES: string
  /** Directory for rendered pages */
  PUBLIC: string
  /** Token for regeneration API */
  REGENERATE_TOKEN?: string
}

/**
 * Base properties for components that support internationalization
 */
export interface LocalizedProps {
  lang: SupportedLanguage
}

/**
 * Page content properties
 */
export interface PageProps extends LocalizedProps {
  /** Full URL of the page */
  address: string
  /** Page title */
  title: string
  /** Page meta description */
  description: string
  /** HTML content of the page */
  content: string
  /** ISO date string of when the page was last updated */
  time: string
  /** URL to the page's featured image */
  image: string
  /** Whether to show the back arrow */
  includeArrow?: boolean
}

/**
 * Properties for heading components
 */
export interface HeadingProps {
  depth: 1 | 2 | 3 | 4 | 5 | 6
  text: string
  id: string
  siteLanguage: SupportedLanguage
}

/**
 * Properties for code snippet components
 */
export interface CodeSnippetProps {
  codeLanguage: string
  text: string
  siteLanguage: SupportedLanguage
}

export interface SocialShareProps {
  lang: SupportedLanguage
  url: string
  text?: string
}

// Type for share button configurations
export type ShareButtonConfig = {
  baseUrl: string
  urlParam?: string
  textParam?: string
}

export interface ImageProps {
  src: string
  alt: string
}
