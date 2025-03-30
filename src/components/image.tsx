import type {ImageProps} from '../types.ts'

/**
 * Renders a markdown image with zoom functionality
 *
 * @param props - Component properties
 * @returns JSX element with zoomable image
 */
const Image = ({src, alt, caption}: ImageProps): JSX.Element => {
  return (
    <div className="image-container">
      <div className="image-zoom-wrapper">
        <img src={src} alt={alt} />
      </div>
      {caption && <em>{caption}</em>}
    </div>
  )
}

export default Image
