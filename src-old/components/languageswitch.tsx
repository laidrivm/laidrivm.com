import type {LocalizedProps} from '../types'

/**
 * Renders a language switcher that toggles between supported languages
 *
 * @param props - Component properties
 * @returns JSX element with language switch link
 */
export function LanguageSwitch({lang}: LocalizedProps): JSX.Element {
  const targetLang = lang === 'en' ? 'ru' : 'en'
  const href = targetLang === 'ru' ? '/ru/' : '/'

  return (
    <a
      href={href}
      className="language-link"
      aria-label={`Switch to ${targetLang} language`}
    >
      {targetLang}
    </a>
  )
}
