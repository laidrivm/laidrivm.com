//import {getLocalizedText} from '../utils.ts'
import type {LocalizedProps} from '../types.ts'

export function Arrow({lang}: LocalizedProps): JSX.Element {
  const href = lang === 'en' ? `/` : `/${lang}/`

  //aria-label={getLocalizedText(lang, 'arrow')}

  return (
    <a href={href} className="arrow-container" aria-label="Back to main page">
      <div className="arrow">←</div>
    </a>
  )
}
