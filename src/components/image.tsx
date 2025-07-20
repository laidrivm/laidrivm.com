import type {ImageProps} from '../types.ts'

export function Image({href, text, caption = ''}: ImageProps): JSX.Element {
  return (
    <div className="image-container">
      <div className="image-zoom-wrapper">
        <img src={href} alt={text} onclick={`zoomImage(this)`} />
      </div>
      {caption && <em>{caption}</em>}
    </div>
  )
}
