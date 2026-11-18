import type { PlayerProfile } from '@rotra/data/player/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { Icon } from '@rotra/ui/icon'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { PlayerIdLine } from '@rotra/ui/player-id-line'
import {
  ProfileCardSection,
  ProfileStatsSection,
  profileStats,
} from '@rotra/ui/profile-banner-card'
import { ProfileHero } from '@rotra/ui/profile-hero'
import { ProfileLeaderboardChips } from '@rotra/ui/profile-leaderboard-chips'
import {
  VerificationStatusChip,
  type VerificationStatusChipProps,
} from '@rotra/ui/verification-status-chip'

export type PlayerIdentityCardProps = {
  profile: PlayerProfile
  /** The level and current-year stats in the public card of a player saved by one club. */
  unclaimedFacts?: { levelLabel: string | null; games: number; wins: number; year: number }
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
  /** Owner only: the status chip and shortcut to Verification. */
  verification?: VerificationStatusChipProps
  onOpenVerification?: () => void
  /** Opens the Share profile sheet: the owner's, or this player's on someone else's profile */
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
  unclaimedFacts,
  isOwn = false,
  idElementId,
  onCopyId,
  onEdit,
  onViewPicture,
  onChangePicture,
  onChangeBanner,
  onOpenPlayerId,
  verification,
  onOpenVerification,
  onShare,
  onCompare,
  compareSignedIn = false,
  bannerKey,
  bannerImageUrl,
}: PlayerIdentityCardProps) {
  const savedBy = isOwn ? undefined : profile.unclaimedSavedBy
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
          badges={
            isOwn ? (
              <>
                <Chip tone="accent">This is you</Chip>
                {verification && onOpenVerification ? (
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center rounded-full touch:min-h-11"
                    onClick={onOpenVerification}
                  >
                    <VerificationStatusChip {...verification} />
                  </button>
                ) : null}
              </>
            ) : savedBy ? (
              <Chip tone="warn">Not registered yet</Chip>
            ) : undefined
          }
        />
        {savedBy && unclaimedFacts ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={unclaimedFacts.levelLabel ? 'accent' : 'neutral'}>
                {unclaimedFacts.levelLabel ?? 'Not ranked yet'}
              </Chip>
              <ProfileLeaderboardChips places={profile.leaderboardPlaces ?? []} />
            </div>
            <ProfileCardSection label="About">
              <KeyValueList items={[{ label: 'Saved by', value: savedBy }]} />
            </ProfileCardSection>
            {profile.showProfileStats !== false ? (
              <ProfileStatsSection
                year={unclaimedFacts.year}
                stats={profileStats(unclaimedFacts.games, unclaimedFacts.wins)}
              />
            ) : null}
          </div>
        ) : null}
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
        {/* One full-width button per row (2026-11-13-player-profile-hero-like-card, pass 2). */}
        {isOwn ? (
          <div className="grid grid-cols-1 gap-2">
            <Button size="sm" onClick={onEdit}>
              <Icon name="edit" /> Edit profile
            </Button>
            <Button size="sm" onClick={onOpenPlayerId}>
              <Icon name="qr" /> My player ID
            </Button>
            {onOpenVerification ? (
              <Button size="sm" onClick={onOpenVerification}>
                <Icon name="shield" /> Verification
              </Button>
            ) : null}
            {onShare ? (
              <Button size="sm" onClick={onShare}>
                <Icon name="share" /> Share profile
              </Button>
            ) : null}
          </div>
        ) : onCompare || onShare ? (
          <div className="grid grid-cols-1 gap-2">
            {onCompare ? (
              <Button size="sm" variant="primary" onClick={onCompare}>
                <Icon name="versus" /> Compare with {compareSignedIn ? 'me' : 'my results'}
              </Button>
            ) : null}
            {onShare ? (
              <Button size="sm" onClick={onShare}>
                <Icon name="share" /> Share profile
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
    </Card>
  )
}
