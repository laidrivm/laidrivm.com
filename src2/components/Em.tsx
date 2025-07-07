import type {EmProps} from '../types.ts'

export function Em({children}: EmProps): JSX.Element {
  return <em className="italic">{children}</em>
}
