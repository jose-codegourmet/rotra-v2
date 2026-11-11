'use client'

import { Button } from '@rotra/ui/button'
import { ShareCard, type ShareCardProps } from '@rotra/ui/share-card'

export type ClubInviteCardProps = Pick<
  ShareCardProps,
  'initialFormat' | 'webShare' | 'onShared' | 'onDownloaded' | 'onError'
> & {
  /** The club invite link (Q19.6), the exact link the QR encodes. */
  link: string
  /** Names the download rotra-club-<slug>-<post|story>.png. */
  slug: string
  clubName: string
  clubInitials?: string
  clubLogoUrl?: string | null
  /** Copies the same link the QR encodes (#708). */
  onCopyLink: () => void
}

/** Q-CLUB's Share club invite sheet: ShareCard's club-invite variant. */
export function ClubInviteCard({
  slug,
  clubName,
  clubInitials,
  clubLogoUrl,
  onCopyLink,
  ...rest
}: ClubInviteCardProps) {
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
      fileName={`rotra-club-${slug}`}
      headline={clubName}
      subline="invites you to play"
      spot={{ initials, imageUrl: clubLogoUrl }}
      title={`${clubName} invites you to play`}
      infoLines={['Register with ROTRA and join the club']}
      qrCaption="Scan to join"
      qrLabel="QR code for the club invite link"
      shareTitle={`${clubName} invites you to play`}
      noteStart="Scanning opens the club registration page."
      noteEnd="Download the image to share it or print it."
      primaryRowAbove={
        <Button className="w-full" onClick={onCopyLink}>
          Copy invite link
        </Button>
      }
      actions="share-or-download"
    />
  )
}
