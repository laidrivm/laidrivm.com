import type {ImageProps} from '../types.ts'

export function Image({href, title, text}: ImageProps): JSX.Element {
  return (
    <img
      src={href}
      alt={text}
      title={title}
      className="max-w-full h-auto my-4"
    />
  )
}
