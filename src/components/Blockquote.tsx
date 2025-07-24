import type {BlockquoteProps} from '../types.ts'

export function Blockquote({children}: BlockquoteProps): JSX.Element {
  return <blockquote>{children}</blockquote>
}
