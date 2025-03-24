import type {LocalizedProps} from '../types'

/**
 * Renders a back arrow that links to the homepage in the current language
 *
 * @param props - Component properties
 * @returns JSX element with a back arrow link
 */
const Arrow = ({lang}: LocalizedProps): JSX.Element => {
  const href = lang === 'ru' ? '/ru/' : '/'

  return (
    <a href={href} className="arrow-container" aria-label="Back to home">
      <div className="arrow">←</div>
    </a>
  )
}

export default Arrow
