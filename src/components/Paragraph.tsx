import type {ParagraphProps} from '../types.ts'

export function Paragraph({children}: ParagraphProps): JSX.Element {
  return <p>{children}</p>
}
