const Arrow = ({lang}: {lang: 'en' | 'ru'}): string => (
  <a href={lang === 'ru' ? '/ru/' : '/'} className="arrow-container">
    <div className="arrow">←</div>
  </a>
)

export default Arrow
