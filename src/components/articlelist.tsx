import type {Links} from '../types.ts'

const ArticleList = ({links}: Links): string => (
  <ul>
    {links.map(link => (
      <li>
        <a href={link.address}>{link.text}</a>
      </li>
    ))}
  </ul>
)

export default ArticleList
