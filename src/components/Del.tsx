import type {DelProps} from '../types.ts'

export function Del({children}: DelProps): JSX.Element {
  return <del>{children}</del>
}
