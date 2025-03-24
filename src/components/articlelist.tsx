import type {Links, Link} from '../types'

/**
 * Renders a list of article links
 *
 * @param props - Component properties containing links array
 * @returns JSX element with an unordered list of links
 */
const ArticleList = ({links}: Links): JSX.Element => {
  if (!Array.isArray(links) || links.length === 0) {
    return <div className="empty-list">No articles available</div>
  }

  return (
    <ul className="article-list">
      {links.map((link: Link, index: number) => (
        <li key={`link-${index}`}>
          <a href={link.address}>{link.text}</a>
        </li>
      ))}
    </ul>
  )
}

export default ArticleList
