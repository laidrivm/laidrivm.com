import type {ListProps} from '../types.ts'

export function List({
  ordered,
  start,
  loose,
  children
}: ListProps): JSX.Element {
  const className = `${loose ? 'mb-4' : 'mb-2'} ${
    ordered ? 'list-decimal' : 'list-disc'
  } list-inside ml-4`

  if (ordered) {
    return (
      <ol className={className} start={start}>
        {children}
      </ol>
    )
  }

  return <ul className={className}>{children}</ul>
}
