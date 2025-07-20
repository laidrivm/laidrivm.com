import type {ParagraphProps} from '../types.ts'

export function Paragraph({children}: ParagraphProps): JSX.Element {
  return <p className="mb-4 leading-relaxed">{children}</p>
}
