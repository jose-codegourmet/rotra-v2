import type { PlayerProfile } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { Icon } from '@rotra/ui/icon'
import { PlayerIdLine } from '@rotra/ui/player-id-line'
import { ProfileHero } from '@rotra/ui/profile-hero'
export type PlayerIdentityCardProps = {
  profile: PlayerProfile
  isOwn?: boolean
  idElementId: string
  onCopyId: () => void
  /** Owner only: opens Edit profile */
  onEdit?: () => void
  /** Opens the full photo (#716) from the big picture; only a real picture is a button */
  onViewPicture?: () => void
  /** Owner only: opens Profile picture */
  onChangePicture?: () => void
  /** Owner only: the banner pencil, opens the Profile banner dialog */
  onChangeBanner?: () => void
  /** Owner only: opens My player ID */
  onOpenPlayerId?: () => void
  /** Owner only: opens the Share profile sheet */
  onShare?: () => void
  /** Public profile: open the comparison (or sign-in). */
  onCompare?: () => void
  compareSignedIn?: boolean
  /** The player's Profile banner key (court, night, dusk, ember, sun, stripe); missing = Court */
  bannerKey?: string | null
  /** An Admin-uploaded banner image; wins over bannerKey */
  bannerImageUrl?: string | null
}
export function PlayerIdentityCard({
  profile,
  isOwn = false,
  idElementId,
  onCopyId,
  onEdit,
  onViewPicture,
  onChangePicture,
  onChangeBanner,
  onOpenPlayerId,
  onShare,
  onCompare,
  compareSignedIn = false,
  bannerKey,
  bannerImageUrl,
}: PlayerIdentityCardProps) {
  return (
    <Card asChild className="overflow-hidden pt-0">
      <section className="flex flex-col gap-3.5">
        <ProfileHero
          name={profile.fullName}
          nickname={profile.nickname}
          pictureSrc={profile.picture}
          bannerKey={bannerKey}
          bannerImageUrl={bannerImageUrl}
          onViewPicture={onViewPicture}
          onChangePicture={isOwn ? (onChangePicture ?? (() => {})) : undefined}
          onChangeBanner={isOwn ? onChangeBanner : undefined}
          badges={isOwn ? <Chip tone="accent">This is you</Chip> : undefined}
        />
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">
            Player ID
          </span>
          <PlayerIdLine rtrId={profile.rtrId} id={idElementId} onCopy={onCopyId} />
          <p className="text-xs text-fg2">
            Shows the city and date this profile was first created. It isn't where{' '}
            {isOwn
              ? 'you live or which club you play for'
              : 'this player lives or which club they play for'}
            .
          </p>
        </div>
        {isOwn ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-2">
            <Button size="sm" onClick={onEdit}>
              <Icon name="edit" /> Edit profile
            </Button>
            <Button size="sm" onClick={onOpenPlayerId}>
              <Icon name="qr" /> My player ID
            </Button>
            {onShare ? (
              <Button size="sm" onClick={onShare}>
                <Icon name="share" /> Share profile
              </Button>
            ) : null}
          </div>
        ) : onCompare ? (
          <Button size="sm" variant="primary" onClick={onCompare}>
            <Icon name="versus" /> Compare with {compareSignedIn ? 'me' : 'my results'}
          </Button>
        ) : null}
      </section>
    </Card>
  )
}
