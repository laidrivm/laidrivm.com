const ArticleList = ({ links }) => (
  <ul>
    {links.map(link => (
      <li>
        <a href={link}>{link}</a>
      </li>
    ))}
  </ul>
)

export default ArticleList
