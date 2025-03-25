import type {TelegramShareProps} from '../types.ts'

import {getLocalizedText} from './utils.ts'

const TelegramShareButton: JSX.Element = ({
  lang,
  url,
  text = ''
}: TelegramShareProps) => {
  const shareText = getLocalizedText('telegram', lang)

  const handleShare = () => {
    const encodedUrl = encodeURIComponent(url)
    const encodedText = encodeURIComponent(text)
    const shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      onClick={handleShare}
      className="telegram-share-button"
      aria-label={shareText}
    >
      <img src="/telegram.svg" alt={shareText} width="32" height="32" />
    </button>
  )
}

export default TelegramShareButton
