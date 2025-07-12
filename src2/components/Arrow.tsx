import {getLocalizedText} from '../utils.ts'
import type {LocalizedProps} from '../types.ts'

export function Arrow({lang}: LocalizedProps): JSX.Element {
  console.log(`Arrow lang: ${lang}`)
  const href = lang === 'en' ? `/` : `/${lang}/`

  return (
    <a
      href={href}
      className="arrow-container"
      aria-label={getLocalizedText(lang, 'arrow')}
    >
      <div className="arrow">←</div>
    </a>
  )
}
