'use client'

import { ShareCard } from '@rotra/ui/share-card'

export type SessionJoinQrProps = {
  /** The visitor public session link, never the preview URL. */
  link: string
  /** Names the download rotra-session-<slug>-<post|story>.png. */
  slug: string
  clubName: string
  clubInitials?: string
  clubLogoUrl?: string | null
  sessionTitle: string
  dateLabel: string
  timeLabel: string
  venueName: string
  initialFormat?: 'post' | 'story'
  onDownloaded?: () => void
  onError?: (message: string) => void
}

/** Q-PREPARE's branded Post/Story image of the public session link: ShareCard's session-join variant. */
export function SessionJoinQr({
  slug,
  clubName,
  clubInitials,
  clubLogoUrl,
  sessionTitle,
  dateLabel,
  timeLabel,
  venueName,
  ...rest
}: SessionJoinQrProps) {
  const initials =
    clubInitials ??
    clubName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  return (
    <ShareCard
      {...rest}
      fileName={`rotra-session-${slug}`}
      headline={clubName}
      subline="is playing badminton"
      spot={{ initials, imageUrl: clubLogoUrl }}
      title={sessionTitle}
      infoLines={[dateLabel, `${timeLabel} · ${venueName}`]}
      qrCaption="Scan to join"
      qrLabel={`QR code for the ${clubName} session link`}
      shareTitle={sessionTitle}
      noteStart="Scanning opens the public session page."
      noteEnd="Download the image to share it or print it."
    />
  )
}
