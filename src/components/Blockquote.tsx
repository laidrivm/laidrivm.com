import type {BlockquoteProps} from '../types.ts'

export function Blockquote({children}: BlockquoteProps): JSX.Element {
  return (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-700">
      {children}
    </blockquote>
  )
}
