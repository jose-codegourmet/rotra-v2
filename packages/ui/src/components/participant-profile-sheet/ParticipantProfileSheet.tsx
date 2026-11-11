'use client'

import type { ParticipantStats, ParticipantTonight } from '@rotra/data/public-session/types'
import { Button } from '@rotra/ui/button'
import { IdentityChip } from '@rotra/ui/identity-chip'
import { KeyValueList } from '@rotra/ui/key-value-list'
import {
  ProfileBannerCard,
  ProfileCardSection,
  ProfileLevelBadge,
  ProfileStatTiles,
} from '@rotra/ui/profile-banner-card'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'

export type ParticipantProfileSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Full name (a registered player seen by a signed-in viewer) */
  name: string
  nickname?: string | null
  photoUrl?: string
  /** Opens the full photo (#716); without it the picture is not a button */
  onPhotoClick?: () => void
  /** The player's Profile banner key; missing draws the accent gradient */
  bannerKey?: string | null
  /** An Admin-uploaded banner image; wins over bannerKey */
  bannerImageUrl?: string | null
  /** Full playing level for the badge, e.g. “Intermediate High”; null reads “No level yet” */
  levelLabel: string | null
  /** The Tonight · line; null when the player is not on tonight's roster */
  tonight?: ParticipantTonight | null
  /** City the profile was first registered in (from the RTR ID) */
  registeredCity: string | null
  rtrId: string | null
  /** Stats · last 90 days; null is “No games yet” */
  stats: ParticipantStats | null
  /** While the stats read is loading */
  statsLoading?: boolean
  /** The stats read failed: the section says so instead of “No games yet” */
  statsError?: boolean
  /** The Player app's public profile (`/find/<RTR>`), opened in a new tab; hidden when missing */
  profileHref?: string | null
}

/**
 * D-PARTICIPANT-PROFILE, full card: the session page's participant profile for a signed-in ROTRA
 * Player. Banner card with the Registered chip and level badge, the Tonight · line, boxed About
 * (Registered in, RTR ID) and Stats · last 90 days; footer Close and Open ROTRA profile.
 */
export function ParticipantProfileSheet({
  open,
  onOpenChange,
  name,
  nickname,
  photoUrl,
  onPhotoClick,
  bannerKey,
  bannerImageUrl,
  levelLabel,
  tonight,
  registeredCity,
  rtrId,
  stats,
  statsLoading = false,
  statsError = false,
  profileHref,
}: ParticipantProfileSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      bodyClassName="p-0"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          {profileHref ? (
            <Button asChild variant="primary">
              <a href={profileHref} target="_blank" rel="noopener noreferrer">
                Open ROTRA profile
              </a>
            </Button>
          ) : null}
        </>
      }
    >
      <ProfileBannerCard
        name={name}
        nickname={nickname}
        photoUrl={photoUrl}
        onPhotoClick={onPhotoClick}
        bannerKey={bannerKey}
        bannerImageUrl={bannerImageUrl}
        chips={
          <>
            <IdentityChip identity="registered" />
            <ProfileLevelBadge>{levelLabel ?? 'No level yet'}</ProfileLevelBadge>
          </>
        }
        tonight={tonight}
      >
        <ProfileCardSection label="About">
          <KeyValueList
            items={[
              { label: 'Registered in', value: registeredCity ?? '—' },
              {
                label: 'RTR ID',
                value: rtrId ? <span className="font-mono text-[13px]">{rtrId}</span> : '—',
              },
            ]}
          />
        </ProfileCardSection>
        <ProfileCardSection label="Stats · last 90 days">
          {statsLoading ? (
            <Skeleton label="Loading stats" className="h-[136px] rounded-lg" />
          ) : statsError ? (
            <p className="m-0 text-fg2">Couldn't load these stats. Try again later.</p>
          ) : stats ? (
            <ProfileStatTiles stats={stats} />
          ) : (
            <p className="m-0 text-fg2">No games yet</p>
          )}
        </ProfileCardSection>
      </ProfileBannerCard>
    </Sheet>
  )
}
