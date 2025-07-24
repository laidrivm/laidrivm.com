import type {CodeSpanProps} from '../types.ts'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function CodeSpan({text}: CodeSpanProps): JSX.Element {
  return <code>{escapeHtml(text)}</code>
}
