import {renderTokens} from '../services/markdown-renderer.tsx'
import type {ImageProps} from '../types.ts'


export function Image({href, text, lang, caption = []}: ImageProps): JSX.Element {
  return (
    <div className="image-container">
      <div className="image-zoom-wrapper">
        <img src={href} alt={text} onclick={`zoomImage(this)`} />
      </div>
      {caption.length > 0 && renderTokens(caption, lang)}
    </div>
  )
}
