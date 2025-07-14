//formatDate
import {getLocalizedText} from '../utils.ts'
import type {ArticleListProps} from '../types.ts'

/**
 * Renders a list of article links
 */
export function ArticlesFeed({lang, links}: ArticleListProps): JSX.Element {
  if (!Array.isArray(links) || links.length === 0) {
    return <></>
  }

  return (
    <section className="articles-section">
      <h2>{getLocalizedText(lang, 'articles')}</h2>
      <ul className="article-list">
        {links.map((link, index) => (
          <li key={`article-${index}`} className="article-item">
            <a href={link.slug} className="article-link">
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

/*
              <h3 className="article-title">{link.title}</h3>
              {link.description && (
                <p className="article-description">{link.description}</p>
              )}
              {link.date && (
                <time className="article-date">{formatDate(link.date)}</time>
              )}
*/
