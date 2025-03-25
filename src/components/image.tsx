import type {ImageProps} from '../types.ts'

/**
 * Renders a markdown image with zoom functionality
 *
 * @param props - Component properties
 * @returns JSX element with zoomable image
 */
const Image = ({src, alt}: ImageProps): JSX.Element => {
  return (
    <div className="image-container">
      <img src={src} alt={alt} />
    </div>
  )
}

export default Image
