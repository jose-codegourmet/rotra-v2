'use client'

import type { ParticipantStats, ParticipantTonight } from '@rotra/data/public-session/types'
import { Button } from '@rotra/ui/button'
import { Icon } from '@rotra/ui/icon'
import { IdentityChip } from '@rotra/ui/identity-chip'
import { KeyValueList } from '@rotra/ui/key-value-list'
import {
  ProfileBannerCard,
  ProfileCardSection,
  ProfileLevelBadge,
  ProfileStatsSection,
} from '@rotra/ui/profile-banner-card'
import { Sheet } from '@rotra/ui/sheet'

export type ParticipantProfileSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Full name (a registered player seen by a signed-in viewer) */
  name: string
  nickname?: string | null
  photoUrl?: string
  /** Opens the full photo (#716); without it the picture is not a button */
  onPhotoClick?: () => void
  /** The player's resolved Profile banner key (the Admin default when they picked none) */
  bannerKey?: string | null
  /** An Admin-uploaded banner image; wins over bannerKey */
  bannerImageUrl?: string | null
  /** Full playing level for the badge, e.g. “Intermediate High”; null reads “No level yet” */
  levelLabel: string | null
  /** The status pill; pass it only while the session is live and the player is on its roster */
  tonight?: ParticipantTonight | null
  /** City the profile was first registered in (from the RTR ID) */
  registeredCity: string | null
  /** The Copy RTR ID button under the name */
  rtrId: string | null
  /** The calendar year the stats count (Latest stats) */
  year: number
  /** Latest stats; null is “No games yet this year” */
  stats: ParticipantStats | null
  /** While the stats read is loading */
  statsLoading?: boolean
  /** The stats read failed: the section says so instead of “No games yet this year” */
  statsError?: boolean
  /**
   * The Player app's public profile (`/find/<RTR>`), opened in a new tab from the icon right of the
   * name and from Open ROTRA profile; both hidden when missing
   */
  profileHref?: string | null
  /** Share profile in the footer (the share dialog); hidden when missing */
  onShare?: () => void
}

/**
 * D-PARTICIPANT-PROFILE, full card: the session page's participant profile for a signed-in ROTRA
 * Player. Header-less banner card with the name block (display name, new-tab icon, full name, Copy
 * RTR ID), the Registered chip and level badge, the status pill while live, boxed About (Registered
 * in) and Latest stats; footer Close, Share profile and Open ROTRA profile (new tab).
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
  year,
  stats,
  statsLoading = false,
  statsError = false,
  profileHref,
  onShare,
}: ParticipantProfileSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={nickname || name}
      headerless
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          {rtrId && onShare ? (
            <Button onClick={onShare}>
              <Icon name="share" size={16} />
              Share profile
            </Button>
          ) : null}
          {profileHref ? (
            <Button asChild variant="primary">
              <a
                href={profileHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open ROTRA profile in a new tab"
              >
                Open ROTRA profile
                <Icon name="external" size={16} />
              </a>
            </Button>
          ) : null}
        </>
      }
    >
      <ProfileBannerCard
        name={name}
        nickname={nickname}
        rtrId={rtrId}
        profileLink={profileHref ? { href: profileHref, newTab: true } : null}
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
          <KeyValueList items={[{ label: 'Registered in', value: registeredCity ?? '—' }]} />
        </ProfileCardSection>
        <ProfileStatsSection
          year={year}
          stats={stats}
          loading={statsLoading}
          error={statsError}
        />
      </ProfileBannerCard>
    </Sheet>
  )
}
