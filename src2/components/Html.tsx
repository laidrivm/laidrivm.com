import type {HtmlProps} from '../types.ts'

export function Html({text, block}: HtmlProps): JSX.Element {
  // For raw HTML, you have several options:
  // 1. Parse and render safely (recommended)
  // 2. Use dangerouslySetInnerHTML (be careful)
  // 3. Strip HTML and render as text

  // This example uses dangerouslySetInnerHTML - use with caution!
  if (block) {
    return <div dangerouslySetInnerHTML={{__html: text}} className="my-4" />
  }

  return <span dangerouslySetInnerHTML={{__html: text}} />
}
