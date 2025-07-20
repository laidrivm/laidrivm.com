import type {CodeSpanProps} from '../types.ts'

export function CodeSpan({text}: CodeSpanProps): JSX.Element {
  return <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{text}</code>
}
