import type {HeadingProps} from '../types'

/**
 * Renders a heading element with the specified depth and optional anchor link
 *
 * @param props - Component properties
 * @returns JSX element with appropriate heading level
 */
const Heading = ({depth, text, id}: HeadingProps): JSX.Element => {
  // Validate the depth value
  const validDepth = (depth >= 1 && depth <= 6 ? depth : 2) as
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6

  // For H1, don't include the anchor link
  if (validDepth === 1) {
    return <h1>{text}</h1>
  }

  // Create the appropriate heading tag
  const Tag = `h${validDepth}` as keyof JSX.IntrinsicElements
  const safeId = id ? id.replace(/[^a-z0-9-_]/gi, '') : ''

  return (
    <Tag id={safeId}>
      <div className="heading-content">
        <a href={`#${safeId}`}>{text}</a>
        <button className="copy-heading">🔗</button>
      </div>
    </Tag>
  )
}

export default Heading
