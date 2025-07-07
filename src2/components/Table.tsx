import type {TableProps} from '../types.ts'

export function Table({children}: TableProps): JSX.Element {
  return (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse">
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
