import type {ListItemProps} from '../types.ts'

export function ListItem({task, loose, children}: ListItemProps): JSX.Element {
  const className = `${loose ? 'mb-2' : 'mb-1'} ${
    task ? 'list-none flex items-start' : ''
  }`

  return <li className={className}>{children}</li>
}
