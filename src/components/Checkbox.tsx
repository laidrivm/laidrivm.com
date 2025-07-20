import type {CheckboxProps} from '../types.ts'

export function Checkbox({checked}: CheckboxProps): JSX.Element {
  return <input type="checkbox" checked={checked} readOnly />
}
