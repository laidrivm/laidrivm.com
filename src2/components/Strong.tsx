import type {StrongProps} from '../types.ts'

export function Strong({children}: StrongProps): JSX.Element {
  return <strong className="font-bold">{children}</strong>
}
