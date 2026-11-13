'use client'

import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { ProfileBannerCard, ProfileCardSection } from '@rotra/ui/profile-banner-card'
import { Sheet } from '@rotra/ui/sheet'

export type PrivateProfileCardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * `private`: an always-private ROTRA player (picture and banner only). `guest`: a guest or an
   * unclaimed profile, no ROTRA account yet.
   */
  variant: 'private' | 'guest'
  /** The masked name (“J*** A***”); the full name never reaches this card */
  name: string
  /** The real picture of an always-private player; guests show initials */
  photoUrl?: string
  /** Opens the full photo (#716), always-private players only */
  onPhotoClick?: () => void
  /** The player's Profile banner key; missing draws the accent gradient */
  bannerKey?: string | null
  /** An Admin-uploaded banner image; wins over bannerKey */
  bannerImageUrl?: string | null
  /** Replaces the section text (game courts: “This player played as a guest …”) */
  text?: string
}

const COPY = {
  private: {
    chip: 'Private profile',
    label: 'Private',
    text: 'This player has chosen to keep their ROTRA profile private. You can see their picture and banner; their name, level and games stay between them and the Queue Master.',
  },
  guest: {
    chip: 'Not on ROTRA yet',
    label: 'Guest',
    text: "This player is playing as a guest and hasn't registered with ROTRA yet, so there's no profile to show. The club keeps their games for when they do.",
  },
} as const

/**
 * D-PARTICIPANT-PROFILE, limited cards: what a signed-in Player sees on tapping an always-private
 * player (picture, banner, masked name, Private profile chip, one Private section) or a guest or
 * unclaimed player (Not on ROTRA yet, one Guest section). No level, status, About or stats; Close only.
 */
export function PrivateProfileCard({
  open,
  onOpenChange,
  variant,
  name,
  photoUrl,
  onPhotoClick,
  bannerKey,
  bannerImageUrl,
  text,
}: PrivateProfileCardProps) {
  const copy = COPY[variant]
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      bodyClassName="p-0"
      footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
    >
      <ProfileBannerCard
        name={name}
        photoUrl={photoUrl}
        onPhotoClick={variant === 'private' ? onPhotoClick : undefined}
        bannerKey={bannerKey}
        bannerImageUrl={bannerImageUrl}
        photoLabel="View full photo"
        chips={<Chip>{copy.chip}</Chip>}
      >
        <ProfileCardSection label={copy.label}>
          <p className="m-0 text-fg2">{text ?? copy.text}</p>
        </ProfileCardSection>
      </ProfileBannerCard>
    </Sheet>
  )
}
