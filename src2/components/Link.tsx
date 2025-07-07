import type {LinkProps} from '../types.ts'

export function Link({href, title, children}: LinkProps): JSX.Element {
  return (
    <a
      href={href}
      title={title}
      className="text-blue-600 hover:text-blue-800 underline"
    >
      {children}
    </a>
  )
}
