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
    return <h1 className="heading-content">{children}</h1>
  }

  const Tag = `h${depth}` as keyof JSX.IntrinsicElements
  const id = generateId(raw)

  return (
    <Tag id={id} className="heading-content">
      <a href={`#${id}`}>{children}</a>
      <button className="copy-heading">🔗</button>
    </Tag>
  )
}
