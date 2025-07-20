import type {CheckboxProps} from '../types.ts'

export function Checkbox({checked}: CheckboxProps): JSX.Element {
  return (
    <input type="checkbox" checked={checked} readOnly className="mr-2 mt-1" />
  )
}
