//block-level
import {Space} from '../components/Space.tsx'
import {Code} from '../components/Code.tsx'
import {Blockquote} from '../components/Blockquote.tsx'
import {Html} from '../components/Html.tsx'
import {Heading} from '../components/Heading.tsx'
import {Hr} from '../components/Hr.tsx'
import {List} from '../components/List.tsx'
import {ListItem} from '../components/ListItem.tsx'
import {Checkbox} from '../components/Checkbox.tsx'
import {Paragraph} from '../components/Paragraph.tsx'
import {Table} from '../components/Table.tsx'
import {TableRow} from '../components/TableRow.tsx'
import {TableCell} from '../components/TableCell.tsx'
//inline
import {Strong} from '../components/Strong.tsx'
import {Em} from '../components/Em.tsx'
import {CodeSpan} from '../components/CodeSpan.tsx'
import {Br} from '../components/Br.tsx'
import {Del} from '../components/Del.tsx'
import {Link} from '../components/Link.tsx'
import {Image} from '../components/Image.tsx'
import {Text} from '../components/Text.tsx'
import {ok} from '../utils.ts'

//typo
import type {
  Token,
  TokensList,
  ServiceResponse,
  FileCollection,
  SupportedLanguage,
  FileInfo
} from '../types.ts'

import {typographyText} from './typography.ts'


let madeLeadParagraph = true

// Type guards for token types
function hasTokens(token: any): token is Token & {tokens: Token[]} {
  return 'tokens' in token && Array.isArray(token.tokens)
}

function hasText(token: any): token is Token & {text: string} {
  return 'text' in token && typeof token.text === 'string'
}

function hasItems(token: any): token is Token & {items: Token[]} {
  return 'items' in token && Array.isArray(token.items)
}

// Handle list rendering
function renderList(token: Token, lang: SupportedLanguage): JSX.Element {
  if (!hasItems(token)) {
    return <List ordered={false} loose={false} raw={''}></List>
  }

  const items = token.items.map((item: Token) => renderListItem(item, lang))

  return (
    <List
      ordered={'ordered' in token ? token.ordered : false}
      start={'start' in token ? token.start : undefined}
      loose={'loose' in token ? token.loose : false}
      raw={'raw' in token ? token.raw : ''}
    >
      {items}
    </List>
  )
}

// Handle list item rendering
function renderListItem(token: Token, lang: SupportedLanguage): JSX.Element {
  // Check if this list item contains a checkbox
  const hasCheckbox = 'task' in token && token.task
  const children = hasTokens(token)
    ? renderTokens(token.tokens as TokensList, lang)
    : hasText(token)
      ? token.text
      : ''

  if (hasCheckbox) {
    return (
      <ListItem
        task={'task' in token ? token.task : false}
        raw={'raw' in token ? token.raw : ''}
        loose={'loose' in token ? token.loose : false}
      >
        <Checkbox checked={'checked' in token ? token.checked : false} />
        {<>{children}</>}
      </ListItem>
    )
  }

  return (
    <ListItem
      task={'task' in token ? token.task : false}
      raw={'raw' in token ? token.raw : ''}
      loose={'loose' in token ? token.loose : false}
    >
      {typeof children === 'string' ? <>{children}</> : children}
    </ListItem>
  )
}

// Handle table rendering
function renderTable(token: Token, lang: SupportedLanguage): JSX.Element {
  // Render header row
  const headerCells =
    'header' in token && Array.isArray(token.header)
      ? token.header.map((cell: any, index: number) => (
          <TableCell
            header={true}
            align={
              'align' in token && Array.isArray(token.align)
                ? token.align[index]
                : null
            }
            raw={'raw' in cell ? cell.raw : ''}
          >
            {hasTokens(cell)
              ? renderTokens(cell.tokens as TokensList, lang)
              : hasText(cell)
                ? cell.text
                : ''}
          </TableCell>
        ))
      : []

  const headerRow =
    headerCells.length > 0 ? (
      <TableRow header={true}>{headerCells}</TableRow>
    ) : (
      <></>
    )

  // Render body rows
  const bodyRows =
    'rows' in token && Array.isArray(token.rows)
      ? token.rows.map((row: any[]) => (
          <TableRow>
            {row.map((cell: any, cellIndex: number) => (
              <TableCell
                header={false}
                align={
                  'align' in token && Array.isArray(token.align)
                    ? token.align[cellIndex]
                    : null
                }
                raw={'raw' in cell ? cell.raw : ''}
              >
                {hasTokens(cell)
                  ? renderTokens(cell.tokens as TokensList, lang)
                  : hasText(cell)
                    ? cell.text
                    : ''}
              </TableCell>
            ))}
          </TableRow>
        ))
      : []

  return (
    <Table raw={'raw' in token ? token.raw : ''}>
      {headerRow}
      <>{bodyRows}</>
    </Table>
  )
}


function isImageWithCaption(tokens: Token[]): boolean {
  if (tokens.length < 2) return false
  // Check if first token is an image
  if (tokens[0].type !== 'image') return false
  // Check if there's text or em following the image
  // Skip any whitespace-only text tokens
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type === 'text' && token.text?.trim() === '') continue
    if (token.type === 'em' || (token.type === 'text' && token.text?.trim())) {
      return true
    }
    break
  }
  return false
}

function extractCaptionTokens(tokens: Token[]): Token[] {
  const captionTokens: Token[] = []
  let foundNonWhitespace = false
  // Start from index 1 (after the image)
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]
    // Skip leading whitespace
    if (!foundNonWhitespace && token.type === 'text' && token.text?.trim() === '') {
      continue
    }
    foundNonWhitespace = true
    captionTokens.push(token)
  }
  return captionTokens
}

// Render individual token
function renderToken(
  token: Token,
  lang: SupportedLanguage
): JSX.Element | string | null {
  console.log(token)

  if (
    hasText(token) &&
    token.type !== 'code' &&
    token.type !== 'html' &&
    token.type !== 'codespan' &&
    token.type !== 'image'
  ) {
    token.text = typographyText(token.text, lang)
  }

  switch (token.type) {
    // Block-level tokens
    case 'space':
      return <Space raw={'raw' in token ? token.raw : ''} />

    case 'code':
      return (
        <Code
          text={hasText(token) ? token.text : ''}
          codeLanguage={'lang' in token ? token.lang : undefined}
          siteLanguage={lang}
          escaped={'escaped' in token ? token.escaped : false}
          raw={'raw' in token ? token.raw : ''}
        />
      )

    case 'blockquote':
      return (
        <Blockquote raw={'raw' in token ? token.raw : ''}>
          {hasTokens(token)
            ? renderTokens(token.tokens as TokensList, lang)
            : hasText(token)
              ? token.text
              : ''}
        </Blockquote>
      )

    case 'html':
      return (
        <Html
          text={hasText(token) ? token.text : ''}
          raw={'raw' in token ? token.raw : ''}
          pre={'pre' in token ? token.pre : false}
          block={'block' in token ? token.block : false}
        />
      )

    case 'heading':
      if ('depth' in token && token.depth === 1) {
        madeLeadParagraph = false
      }
      return (
        <Heading
          depth={'depth' in token ? token.depth : 1}
          raw={'raw' in token ? token.raw : ''}
        >
          {hasTokens(token)
            ? renderTokens(token.tokens as TokensList, lang)
            : hasText(token)
              ? token.text
              : ''}
        </Heading>
      )

    case 'hr':
      return <Hr />

    case 'list':
      return renderList(token, lang)

    case 'list_item':
      return renderListItem(token, lang)

    case 'paragraph':
      if (hasTokens(token) && isImageWithCaption(token.tokens)) {
        const imageToken = token.tokens[0]
        const captionTokens = extractCaptionTokens(token.tokens)
        return (
          <Image
            href={'href' in imageToken ? imageToken.href : ''}
            title={'title' in imageToken ? imageToken.title : undefined}
            text={hasText(imageToken) ? imageToken.text : ''}
            raw={'raw' in imageToken ? imageToken.raw : ''}
            caption = {captionTokens}
            lang = {lang}
          />
        )
      }
      if (hasTokens(token)) {
        if (!madeLeadParagraph) {
          madeLeadParagraph = true
          return (
            <Paragraph raw={'raw' in token ? token.raw : ''} lead={true}>
              {renderTokens(token.tokens as TokensList, lang)}
            </Paragraph>
          )
        }
        return (
          <Paragraph raw={'raw' in token ? token.raw : ''}>
            {renderTokens(token.tokens as TokensList, lang)}
          </Paragraph>
        )
      }
      if (hasText(token)) {
        if (!madeLeadParagraph) {
          madeLeadParagraph = true
          return (
            <Paragraph raw={'raw' in token ? token.raw : ''} lead={true}>
              {token.text}
            </Paragraph>
          )
        }
        return (
          <Paragraph raw={'raw' in token ? token.raw : ''}>
            {token.text}
          </Paragraph>
        )
      }
      return null

    case 'table':
      return renderTable(token, lang)

    // Inline tokens
    case 'strong':
      return (
        <Strong raw={'raw' in token ? token.raw : ''}>
          {hasTokens(token)
            ? renderTokens(token.tokens as TokensList, lang)
            : hasText(token)
              ? token.text
              : ''}
        </Strong>
      )

    case 'em':
      return (
        <Em raw={'raw' in token ? token.raw : ''}>
          {hasTokens(token)
            ? renderTokens(token.tokens as TokensList, lang)
            : hasText(token)
              ? token.text
              : ''}
        </Em>
      )

    case 'codespan':
      return (
        <CodeSpan
          text={hasText(token) ? token.text : ''}
          raw={'raw' in token ? token.raw : ''}
        />
      )

    case 'br':
      return <Br />

    case 'del':
      return (
        <Del raw={'raw' in token ? token.raw : ''}>
          {hasTokens(token)
            ? renderTokens(token.tokens as TokensList, lang)
            : hasText(token)
              ? token.text
              : ''}
        </Del>
      )

    case 'link':
      return (
        <Link
          href={'href' in token ? token.href : ''}
          title={'title' in token ? token.title : undefined}
          raw={'raw' in token ? token.raw : ''}
        >
          {hasTokens(token)
            ? renderTokens(token.tokens as TokensList, lang)
            : hasText(token)
              ? token.text
              : ''}
        </Link>
      )

    case 'image':
      return (
        <Image
          href={'href' in token ? token.href : ''}
          title={'title' in token ? token.title : undefined}
          text={hasText(token) ? token.text : ''}
          raw={'raw' in token ? token.raw : ''}
        />
      )

    case 'text':
      return (
        <Text
          raw={'raw' in token ? token.raw : ''}
          escaped={'escaped' in token ? token.escaped : false}
        >
          {hasTokens(token)
            ? renderTokens(token.tokens as TokensList, lang)
            : hasText(token)
              ? token.text
              : ''}
        </Text>
      )

    case 'escape':
      return hasText(token) ? token.text : null

    default:
      console.warn(`Unknown token type: ${token.type}`)
      return hasText(token) ? token.text : null
  }
}

export function renderTokens(
  tokens: TokensList,
  lang: SupportedLanguage
): JSX.Element[] {
  return tokens
    .map(token => {
      const rendered = renderToken(token, lang)
      // Filter out null values and wrap strings in fragments
      if (rendered === null) return null
      if (typeof rendered === 'string') return <>{rendered}</>
      return rendered
    })
    .filter((el): el is JSX.Element => el !== null)
}

export async function renderMarkdown(
  markdownContent: ServiceResponse<FileCollection>
): Promise<ServiceResponse<FileCollection>> {
  if (!markdownContent.success || !markdownContent.data) {
    return markdownContent
  }
  if (markdownContent.data.mode === 'skip') {
    console.log(`Skipping rendering markdown`)
    return markdownContent
  }
  const files = markdownContent.data.files
  const processedFiles: FileInfo[] = []
  for (const file of files) {
    if (
      file.type === 'markdown' &&
      file.content &&
      Array.isArray(file.content)
    ) {
      console.log(`Rendering markdown tokens from ${file.localPath}`)
      const lang = file.pageTemplateProps?.lang || 'en'
      const htmlContent = <>{renderTokens(file.content as TokensList, lang)}</>
      processedFiles.push({
        ...file,
        content: htmlContent,
        type: 'html'
      })
    } else {
      processedFiles.push(file)
    }
  }

  return ok({
    ...markdownContent.data,
    files: processedFiles
  })
}
