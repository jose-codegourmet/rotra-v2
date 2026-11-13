'use client'

import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { Icon } from '@rotra/ui/icon'
import { KeyValueList } from '@rotra/ui/key-value-list'
import {
  ProfileBannerCard,
  ProfileCardSection,
  ProfileStatsSection,
  profileStats,
} from '@rotra/ui/profile-banner-card'
import { Sheet } from '@rotra/ui/sheet'

export type ClubMemberProfile =
  | {
      kind: 'public'
      name: string
      nickname: string | null
      picture?: string | null
      /** The level label, or null when the player has no rank yet ("Not ranked yet") */
      levelLabel: string | null
      /** Overall leaderboard position, or null when not on the leaderboard */
      position: number | null
      isYou: boolean
      /** City the profile was first registered in (from the RTR ID) */
      registeredCity: string | null
      /** The Copy player ID button under the name */
      rtrId: string | null
      /** Counted games this calendar year; null while unknown */
      stats: { games: number; wins: number; losses: number } | null
      bannerKey?: string | null
      bannerImageUrl?: string | null
    }
  | {
      /** Masked: visitors, or an always-private player for everyone but themself */
      kind: 'private'
      /** The masked name ("J*** D***") */
      name: string
      picture?: string | null
      /** The player's own banner: the picture and banner stay public */
      bannerKey?: string | null
      bannerImageUrl?: string | null
    }

export type ClubMemberProfileSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ClubMemberProfile
  /** The calendar year the stats count (Latest stats) */
  year: number
  /** The stats are still loading */
  loading?: boolean
  /**
   * false when the player turned off Show my profile stats (2026-11-13-player-stats-visibility) and
   * the viewer is someone else: Latest stats is left out. Default true.
   */
  showStats?: boolean
  /** The profile page (`/players/<id>`): the forward icon right of the name */
  profileHref: string
  /** Open ROTRA profile and the name icon: in-app navigation, same tab (the card closes) */
  onOpenFullProfile: () => void
  /** Share profile (the share dialog for this player); hidden when missing */
  onShare?: () => void
  /** Opens the full photo; the picture is a button only when given and a photo is set */
  onViewPhoto?: () => void
}

/**
 * The profile dialog in ROTRA Player (D-PARTICIPANT-PROFILE): club page members, the leaderboard.
 * A header-less banner card with the round picture, the name block (display name with a forward
 * arrow to the profile, full name, Copy player ID), level, #N overall and You, then About
 * (Registered in) and Latest stats. Footer Close, Share profile and Open ROTRA profile (same tab).
 * A masked member opens the private card with their own banner.
 */
export function ClubMemberProfileSheet({
  open,
  onOpenChange,
  profile,
  year,
  loading = false,
  showStats = true,
  profileHref,
  onOpenFullProfile,
  onShare,
  onViewPhoto,
}: ClubMemberProfileSheetProps) {
  if (profile.kind === 'private')
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={profile.name}
        headerless
        footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
      >
        <ProfileBannerCard
          name={profile.name}
          photoUrl={profile.picture ?? undefined}
          bannerKey={profile.bannerKey}
          bannerImageUrl={profile.bannerImageUrl}
          chips={<Chip>Private profile</Chip>}
        >
          <ProfileCardSection label="Private">
            <p className="m-0 text-fg2">
              This player has chosen to keep their ROTRA profile private. You can see their picture
              and banner; their name, level and games stay between them and their clubs.
            </p>
          </ProfileCardSection>
        </ProfileBannerCard>
      </Sheet>
    )
  const stats = profile.stats
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={profile.nickname || profile.name}
      headerless
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          {onShare ? (
            <Button onClick={onShare}>
              <Icon name="share" size={16} />
              Share profile
            </Button>
          ) : null}
          <Button variant="primary" onClick={onOpenFullProfile}>
            Open ROTRA profile
          </Button>
        </>
      }
    >
      <ProfileBannerCard
        name={profile.name}
        nickname={profile.nickname}
        rtrId={profile.rtrId}
        idLabel="player ID"
        profileLink={{ href: profileHref, newTab: false, onNavigate: onOpenFullProfile }}
        photoUrl={profile.picture ?? undefined}
        onPhotoClick={onViewPhoto}
        bannerKey={profile.bannerKey}
        bannerImageUrl={profile.bannerImageUrl}
        chips={
          <>
            <Chip tone={profile.levelLabel ? 'accent' : 'neutral'}>
              {profile.levelLabel ?? 'Not ranked yet'}
            </Chip>
            {profile.position ? (
              <Chip>#{profile.position.toLocaleString('en-US')} overall</Chip>
            ) : null}
            {profile.isYou ? <Chip tone="accent">You</Chip> : null}
          </>
        }
      >
        <ProfileCardSection label="About">
          <KeyValueList items={[{ label: 'Registered in', value: profile.registeredCity ?? '—' }]} />
        </ProfileCardSection>
        {showStats ? (
          <ProfileStatsSection
            year={year}
            loading={loading}
            stats={stats ? profileStats(stats.games, stats.wins) : null}
          />
        ) : null}
      </ProfileBannerCard>
    </Sheet>
  )
}
