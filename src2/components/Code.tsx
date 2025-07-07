import type {CodeProps} from '../types.ts'

export function Code({text, lang}: CodeProps): JSX.Element {
  return (
    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
      <code className={lang ? `language-${lang}` : ''}>{text}</code>
    </pre>
  )
}
