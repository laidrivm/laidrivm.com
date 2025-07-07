import type {SpaceProps} from '../types.ts'

export function Space({raw}: SpaceProps): JSX.Element {
  // Space tokens are typically just whitespace
  // You might want to preserve them or ignore them
  return <>{raw}</>
}
