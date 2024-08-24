interface Link {
  text: string
  address: string
}

type Links = Link[]

interface Index {
  path: string
  links: Links
  language: 'en' | 'ru'
}

type Indexes = Index[]

export type {
  Links,
  Indexes
}
