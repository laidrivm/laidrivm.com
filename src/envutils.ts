export function initDefaults(): void {
  if (!process.env.PORT) {
    process.env.PORT = '3000'
    console.log(`Using default port: ${process.env.PORT}`)
  }
  if (!process.env.ADDRESS) {
    process.env.ADDRESS = 'localhost'
    console.log(`Using default site address: ${process.env.ADDRESS}`)
  }
  if (!process.env.SOURCE) {
    process.env.SOURCE = 'local'
    console.log(`Using default source for the content: ${process.env.SOURCE}`)
  }
  if (!process.env.GITHUB_TOKEN) {
    process.env.GITHUB_TOKEN = 'unauth'
    console.log(`Using default token for GitHub: ${process.env.GITHUB_TOKEN}`)
  }
  if (!process.env.ARTICLES) {
    process.env.ARTICLES = 'articles'
    console.log(
      `Using default directory to store content sources: ${process.env.ARTICLES}`
    )
  }
  if (!process.env.PUBLIC) {
    process.env.PUBLIC = 'public'
    console.log(
      `Using default directory to render and serve pages: ${process.env.PUBLIC}`
    )
  }
}
