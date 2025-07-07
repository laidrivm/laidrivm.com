import type {TextProps} from '../types.ts'

export function Text({children}: TextProps): JSX.Element {
  // Text tokens can contain nested tokens or plain text
  return <>{children}</>
}
