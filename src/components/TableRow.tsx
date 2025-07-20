import type {TableRowProps} from '../types.ts'

export function TableRow({header, children}: TableRowProps): JSX.Element {
  return (
    <tr
      className={
        header ? 'border-b-2 border-gray-300' : 'border-b border-gray-200'
      }
    >
      {children}
    </tr>
  )
}
