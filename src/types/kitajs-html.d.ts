declare module '@kitajs/html' {
  namespace JSX {
    interface HtmlTag {
      dangerouslySetInnerHTML?: {
        __html: string
      }
    }

    interface HtmlDivTag extends HtmlTag {}
    interface HtmlSpanTag extends HtmlTag {}

    interface IntrinsicElements {
      // Allow any string as element name for dynamic tags
      [elemName: string]: any
    }
  }
}
