import type {HtmlProps} from '../types.ts'

export function Html({text, block}: HtmlProps): JSX.Element {
  if (block) {
    return <div>{text}</div>
  }

  return <span>{text}</span>
}
