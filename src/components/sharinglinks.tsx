import type {SocialShareProps, ShareButtonConfig} from '../types.ts'

import {getLocalizedText} from './utils.ts'

// Social share button configurations
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

const SocialShareLink = ({platform, lang, url, text = ''}): JSX.Element => {
  const config = SHARE_CONFIGS[platform]
  if (!config) return null

  const shareText = getLocalizedText(platform, lang)

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
      <img src={`/${platform}.svg`} alt={shareText} width="32" height="32" />
    </a>
  )
}

export function SharingLinks({lang, url, text}: SocialShareProps): JSX.Element {
  const platforms = ['telegram', 'reddit', 'bluesky', 'minds']

  return (
    <div className="sharing-links">
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
