import unidecode from 'unidecode'

import type {HeadingProps} from '../types.ts'

function generateId(text: string): string {
  const transliterated = unidecode(text)

  return transliterated
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export function Heading({depth, children, raw}: HeadingProps): JSX.Element {
  if (depth === 1) {
    return <h1>{children}</h1>
  }

  const Tag = `h${depth}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  const id = generateId(raw)

  return (
    <Tag id={id} className="heading-content">
      <a href={`#${id}`}>{children}</a>
      <button className="copy-heading" onclick={`copyHeading(this)`}>
        🔗
      </button>
    </Tag>
  )
}
