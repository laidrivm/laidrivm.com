import type {TokensList, Token} from 'marked'

export interface ServiceResponse<T, E = Error> {
  success: boolean
  error?: E
  data?: T
}

export type FileType = 'markdown' | 'unsupported' | 'html'

export type GenerateType = 'new' | 'all' | 'initial' | 'skip' | 'local'

export interface FileInfo {
  sourcePath: string // Original GitHub path
  localPath?: string // Local filesystem path
  content?: string | TokensList | JSX.Element
  frontmatter?: Object
  sha: string | null
  size: number
  lastModified: Date
  type: FileType
  PageTemplateProps: PageTemplateProps
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

export interface HeadingProps {
  depth: number
  raw: string
  children: JSX.Element | JSX.Element[]
}

export interface ParagraphProps {
  raw: string
  children: JSX.Element | JSX.Element[]
}

export interface ListProps {
  ordered: boolean
  start?: number
  loose: boolean
  raw: string
  children: JSX.Element | JSX.Element[]
}

export interface ListItemProps {
  task: boolean
  loose: boolean
  raw: string
  children: JSX.Element | JSX.Element[]
}

export interface CheckboxProps {
  checked: boolean
}

export interface CodeProps {
  text: string
  codeLanguage?: string
  siteLanguage?: SupportedLanguage
  escaped?: boolean
  raw: string
}

export interface CodeSpanProps {
  text: string
  raw: string
}

export interface BlockquoteProps {
  raw: string
  children: JSX.Element | JSX.Element[]
}

export interface LinkProps {
  href: string
  title?: string
  raw: string
  children: JSX.Element | JSX.Element[]
}

export interface ImageProps {
  href: string
  title?: string
  caption?: string
  text: string
  raw: string
}

export interface StrongProps {
  raw: string
  children: JSX.Element | JSX.Element[]
}

export interface EmProps {
  raw: string
  children: JSX.Element | JSX.Element[]
}

export interface DelProps {
  raw: string
  children: JSX.Element | JSX.Element[]
}

export interface HrProps {
  raw: string
}

export interface BrProps {
  raw: string
}

export interface TableProps {
  raw: string
  children: JSX.Element | JSX.Element[]
}

export interface TableRowProps {
  header?: boolean
  children: JSX.Element | JSX.Element[]
}

export interface TableCellProps {
  header: boolean
  align?: 'left' | 'center' | 'right'
  raw: string
  children: JSX.Element | JSX.Element[]
}

export interface HtmlProps {
  text: string
  raw: string
  pre?: boolean
  block?: boolean
}

export interface SpaceProps {
  raw: string
}

export interface TextProps {
  raw: string
  escaped?: boolean
  children: JSX.Element | JSX.Element[]
}

export interface LocalizedProps {
  lang: SupportedLanguage
}

export interface SocialProps {
  lang: SupportedLanguage
  date: Date
  url: string
  description: string
}

export interface SharingLinksProps {
  lang: SupportedLanguage
  url: string
  text: string
}

export interface PageTemplateProps {
  title: string
  children: JSX.Element | JSX.Element[]
  lang: string
  description: string
  updatedAt: Date
  image: string
  url: string
  includeArrow: boolean
}

export type SupportedLanguage = 'en' | 'ru'

export type ShareButtonConfig = {
  baseUrl: string
  urlParam?: string
  textParam?: string
}

export type {TokensList, Token}
