import type {ImageProps, Token} from '../types.ts'

function captionToHTML(caption: Token) {
  let result = ''
  for (const token of caption.tokens) {
    switch (token.type) {
      case 'text':
        result += token.text
        break
      case 'link':
        result += `<a href='${token.href}'>${token.text}</a>`
        break
      default:
    }
  }
  return result
}

/**
 * Renders a markdown image with zoom functionality
 *
 * @param props - Component properties
 * @returns JSX element with zoomable image
 */
export function Image({src, alt, caption}: ImageProps): JSX.Element {
  return (
    <div className="image-container">
      <div className="image-zoom-wrapper">
        <img src={src} alt={alt} />
      </div>
      {caption && (
        <em dangerouslySetInnerHTML={{__html: captionToHTML(caption)}} />
      )}
    </div>
  )
}
