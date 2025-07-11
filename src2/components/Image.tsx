import type {ImageProps} from '../types.ts'

export function Image({
  href,
  title,
  text,
  caption = null
}: ImageProps): JSX.Element {
  return (
    <div className="image-container">
      <div className="image-zoom-wrapper">
        <img src={href} alt={title} />
      </div>
      {text}
      {caption && <em>{caption}</em>}
    </div>
  )
}
