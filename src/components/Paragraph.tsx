import type {ParagraphProps} from '../types.ts'

export function Paragraph({
  children,
  lead = false
}: ParagraphProps): JSX.Element {
  return <p className={lead && 'lead'}>{children}</p>
}
