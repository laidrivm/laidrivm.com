import {getLocalizedText} from '../utils.ts'
import type {
  SupportedLanguage,
  SocialProps,
  SharingLinksProps,
  ShareButtonConfig
} from '../types.ts'

const SHARE_CONFIGS: Record<string, ShareButtonConfig> = {
  telegram: {
    baseUrl: 'https://t.me/share/url',
    urlParam: 'url',
    textParam: 'text'
  },
  reddit: {
    baseUrl: 'https://reddit.com/submit',
    urlParam: 'url',
    textParam: 'title'
  },
  bluesky: {
    baseUrl: 'https://bsky.app/intent/compose',
    urlParam: 'text'
  },
  minds: {
    baseUrl: 'https://www.minds.com/newsfeed/subscriptions/latest',
    urlParam: 'intentUrl'
  }
}

function formatDate(lang: SupportedLanguage, isoDate: string): string {
  if (
    !isoDate ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(isoDate)
  ) {
    console.warn('Invalid date format provided:', isoDate)
    return ''
  }

  try {
    const date = new Date(isoDate)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date')
    }

    const formatter = new Intl.DateTimeFormat(lang, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return formatter.format(date)
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}

function SocialShareLink({platform, lang, url, text = ''}): JSX.Element {
  const config = SHARE_CONFIGS[platform]
  if (!config) return null

  const shareText = getLocalizedText(lang, platform)

  // Generate share URL
  const params = new URLSearchParams()

  // Add URL parameter if specified in config
  if (config.urlParam && url) {
    params.append(config.urlParam, url)
  }

  // Add text parameter if specified in config
  if (config.textParam && text) {
    params.append(config.textParam, text.slice(0, 300))
  }

  const shareUrl = `${config.baseUrl}?${params.toString()}`

  return (
    <a
      href={shareUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`social-share-link ${platform}-share-link`}
      aria-label={shareText}
    >
      <img
        src={`/icons/${platform}.svg`}
        alt={shareText}
        width="32"
        height="32"
      />
    </a>
  )
}

function SharingLinks({lang, url, text}: SharingLinksProps): JSX.Element {
  const platforms = ['telegram', 'reddit', 'bluesky', 'minds']

  return (
    <div className="sharing-links">
      <p>{getLocalizedText(lang, 'share')}: </p>
      {platforms.map(platform => (
        <SocialShareLink
          platform={platform}
          lang={lang}
          url={url}
          text={text}
        />
      ))}
    </div>
  )
}

export function Social({
  lang,
  date,
  url,
  description
}: SocialProps): JSX.Element {
  const updateText = getLocalizedText(lang, 'updated')
  const formattedDate = formatDate(lang, date)

  return (
    <div className="social">
      <SharingLinks lang={lang} url={url} text={description} />
      <p>
        {updateText}
        <time dateTime={date}>{formattedDate}</time>
      </p>
    </div>
  )
}
