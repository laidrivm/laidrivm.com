import type {TableCellProps} from '../types.ts'

export function TableCell({
  header,
  align,
  children
}: TableCellProps): JSX.Element {
  const Tag = header ? 'th' : 'td'
  const className = `px-4 py-2 ${header ? 'font-semibold' : ''}`
  const style = {textAlign: align || 'left'}

  return (
    <Tag className={className} style={style}>
      {children}
    </Tag>
  )
}
