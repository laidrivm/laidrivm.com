import type {LinkProps} from '../types.ts'

export function Link({href, title, children}: LinkProps): JSX.Element {
  return (
    <a href={href} title={title}>
      {children}
    </a>
  )
}
