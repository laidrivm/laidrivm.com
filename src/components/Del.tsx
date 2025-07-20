import type {DelProps} from '../types.ts'

export function Del({children}: DelProps): JSX.Element {
  return <del className="line-through">{children}</del>
}
