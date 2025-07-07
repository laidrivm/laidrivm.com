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
import type {
  Token,
  TokensList,
  ServiceResponse,
  FileCollection
} from '../types.ts'

let wasPrintedOnce = false

// Handle list rendering
function renderList(token: Token, key: number): JSX.Element {
  const items =
    token.items?.map((item: Token, index: number) =>
      renderListItem(item, index)
    ) || []

  return (
    <List
      key={key}
      ordered={token.ordered}
      start={token.start}
      loose={token.loose}
      raw={token.raw}
    >
      {items}
    </List>
  )
}

// Handle list item rendering
function renderListItem(token: Token, key: number): JSX.Element {
  // Check if this list item contains a checkbox
  const hasCheckbox = token.task
  const children = token.tokens ? renderTokens(token.tokens) : token.text

  if (hasCheckbox) {
    return (
      <ListItem key={key} task={token.task} raw={token.raw} loose={token.loose}>
        <Checkbox checked={token.checked} />
        {children}
      </ListItem>
    )
  }

  return (
    <ListItem key={key} task={token.task} raw={token.raw} loose={token.loose}>
      {children}
    </ListItem>
  )
}

// Handle table rendering
function renderTable(token: Token, key: number): JSX.Element {
  // Render header row
  const headerCells =
    token.header?.map((cell: Token, index: number) => (
      <TableCell
        key={index}
        header={true}
        align={cell.align || token.align?.[index]}
        raw={cell.raw}
      >
        {cell.tokens ? renderTokens(cell.tokens) : cell.text}
      </TableCell>
    )) || []

  const headerRow =
    headerCells.length > 0 ? (
      <TableRow key="header" header={true}>
        {headerCells}
      </TableRow>
    ) : null

  // Render body rows
  const bodyRows =
    token.rows?.map((row: Token[], rowIndex: number) => (
      <TableRow key={rowIndex}>
        {row.map((cell: Token, cellIndex: number) => (
          <TableCell
            key={cellIndex}
            header={false}
            align={cell.align || token.align?.[cellIndex]}
            raw={cell.raw}
          >
            {cell.tokens ? renderTokens(cell.tokens) : cell.text}
          </TableCell>
        ))}
      </TableRow>
    )) || []

  return (
    <Table key={key} raw={token.raw}>
      {headerRow}
      {bodyRows}
    </Table>
  )
}

// Render individual token
function renderToken(token: Token, key: number): JSX.Element {
  switch (token.type) {
    // Block-level tokens
    case 'space':
      return <Space key={key} raw={token.raw} />

    case 'code':
      return (
        <Code
          key={key}
          text={token.text || ''}
          lang={token.lang}
          escaped={token.escaped}
          raw={token.raw}
        />
      )

    case 'blockquote':
      return (
        <Blockquote key={key} raw={token.raw}>
          {token.tokens ? renderTokens(token.tokens) : token.text}
        </Blockquote>
      )

    case 'html':
      return (
        <Html
          key={key}
          text={token.text || ''}
          raw={token.raw}
          pre={token.pre}
          block={token.block}
        />
      )

    case 'heading':
      return (
        <Heading key={key} depth={token.depth} raw={token.raw}>
          {token.tokens ? renderTokens(token.tokens) : token.text}
        </Heading>
      )

    case 'hr':
      return <Hr key={key} raw={token.raw} />

    case 'list':
      return renderList(token, key)

    case 'list_item':
      return renderListItem(token, key)

    case 'paragraph':
      return (
        <Paragraph key={key} raw={token.raw}>
          {token.tokens ? renderTokens(token.tokens) : token.text}
        </Paragraph>
      )

    case 'table':
      return renderTable(token, key)

    // Inline tokens
    case 'strong':
      return (
        <Strong key={key} raw={token.raw}>
          {token.tokens ? renderTokens(token.tokens) : token.text}
        </Strong>
      )

    case 'em':
      return (
        <Em key={key} raw={token.raw}>
          {token.tokens ? renderTokens(token.tokens) : token.text}
        </Em>
      )

    case 'codespan':
      return <CodeSpan key={key} text={token.text || ''} raw={token.raw} />

    case 'br':
      return <Br key={key} raw={token.raw} />

    case 'del':
      return (
        <Del key={key} raw={token.raw}>
          {token.tokens ? renderTokens(token.tokens) : token.text}
        </Del>
      )

    case 'link':
      return (
        <Link key={key} href={token.href} title={token.title} raw={token.raw}>
          {token.tokens ? renderTokens(token.tokens) : token.text}
        </Link>
      )

    case 'image':
      return (
        <Image
          key={key}
          href={token.href}
          title={token.title}
          text={token.text || ''}
          raw={token.raw}
        />
      )

    case 'text':
      return (
        <Text key={key} raw={token.raw} escaped={token.escaped}>
          {token.tokens ? renderTokens(token.tokens) : token.text}
        </Text>
      )

    case 'escape':
      return token.text

    default:
      console.warn(`Unknown token type: ${token.type}`)
      return token.text || null
  }
}

function renderTokens(tokens: TokensList): JSX.Element {
  return tokens.map((token, index) => renderToken(token, index))
}

export function markdownToJSX(
  markdownContent: ServiceResponse<FileCollection>
): Promise<ServiceResponse<FileCollection>> {
  if (!markdownContent.success) {
    return markdownContent
  }
  if (markdownContent.data.mode === 'skip') {
    console.log(`Skipping rendering markdown to JSX`)
    return ok({
      mode: 'skip'
    })
  }
  const files = markdownContent.data.files
  const processedFiles = []
  for (const file of files) {
    if (file.type === 'markdown') {
      console.log(
        `Trying to render markdown tokens from ${file.localPath} to JSX`
      )
      const JSXContent = <>{renderTokens(file.content)}</>
      processedFiles.push({
        ...file,
        content: JSXContent
      })
      if (!wasPrintedOnce) {
        wasPrintedOnce = true
        console.log(JSXContent.props.children[0])
      }
    } else {
      processedFiles.push(file)
    }
  }

  return ok({
    ...markdownContent.data,
    files: processedFiles
  })
}
