import type {HeadingProps} from '../types.ts'

export function Heading({depth, children}: HeadingProps): JSX.Element {
  const Tag = `h${depth}` as keyof JSX.IntrinsicElements

  const className =
    {
      1: 'text-4xl font-bold mt-6 mb-4',
      2: 'text-3xl font-semibold mt-5 mb-3',
      3: 'text-2xl font-medium mt-4 mb-2',
      4: 'text-xl font-medium mt-3 mb-2',
      5: 'text-lg font-medium mt-2 mb-1',
      6: 'text-base font-medium mt-2 mb-1'
    }[depth] || 'text-base'

  return <Tag className={className}>{children}</Tag>
}
