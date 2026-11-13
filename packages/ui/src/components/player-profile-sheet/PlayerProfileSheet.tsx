'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import type { ParticipantStats, ParticipantTonight } from '@rotra/data/public-session/types'
import { Button } from '@rotra/ui/button'
import { IdentityChip } from '@rotra/ui/identity-chip'
import type { Identity } from '@rotra/ui/identity-chip/variants'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { levelLabel } from '@rotra/ui/level-pill'
import {
  ProfileBannerCard,
  ProfileCardSection,
  ProfileLevelBadge,
  ProfileStatsSection,
} from '@rotra/ui/profile-banner-card'
import { JOINED_VIA_TEXT } from '@rotra/ui/saved-player-card'
import { Sheet } from '@rotra/ui/sheet'
import { toast } from '@rotra/ui/toaster'

export type PlayerProfileSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  photoUrl?: string
  identity: Identity
  nickname: string | null
  /** The club's level suggestion for this player */
  level: PlayingLevel | null
  /**
   * On tonight's roster: their level for this session (badge “LEVEL tonight”). Missing or null
   * falls back to the suggestion (“LEVEL · suggestion”), then “No level yet”.
   */
  tonightLevel?: PlayingLevel | null
  /** The status pill; pass it only while the session is live and the player is on its roster */
  tonight?: ParticipantTonight | null
  /** Opens the full photo (#716); without it the picture is not a button */
  onPhotoClick?: () => void
  /** The player's resolved Profile banner key (the Admin default for no pick, guests, unclaimed) */
  bannerKey?: string | null
  /** An Admin-uploaded banner image; wins over bannerKey */
  bannerImageUrl?: string | null
  /** City the profile was first registered in (from the RTR ID) */
  registeredCity: string | null
  /** The Copy RTR ID button under the name; none for guests and unclaimed records */
  rtrId: string | null
  /** The Player app's `/find/<RTR>` profile: the new-tab icon right of the name; hidden when missing */
  profileHref?: string | null
  /** The calendar year the stats count (Latest stats) */
  year: number
  /** Latest stats; null is “No games yet this year” */
  stats: ParticipantStats | null
  statsLoading?: boolean
  /** Long date the club saved them, e.g. "October 3, 2026" */
  addedLabel: string
  sessionsHere: number
  /** The player hid their phone. The number itself is never passed to this component */
  phoneHidden: boolean
  /** How they joined; null or absent reads "Added by the club" */
  joinedVia?: 'club' | 'session' | null
  /** Opened from a dialog: the footer offers Back to that dialog instead of Close */
  backLabel?: 'suggestion' | 'match' | 'payments'
  onBack?: () => void
  /** Shown for guests and unclaimed profiles */
  onInvite?: () => void
  /** Edit details, shown for guests and unclaimed profiles (a registered player owns their details) */
  onEdit?: () => void
  /** Delete player, any saved player; hidden when opened from another dialog */
  onDelete?: () => void
  /** Opens the Link to saved player… sheet. Pass only for a guest's record, and not when opened from another dialog. */
  onLinkToSavedPlayer?: () => void
  /** The delete is being checked or saved */
  deleting?: boolean
  /** Absolute ROTRA Player registration link. Guests get an Invite to ROTRA section; hidden when absent. */
  inviteUrl?: string
}

const STATUS: Record<Identity, string> = {
  registered: 'Registered ROTRA player',
  unclaimed: 'Saved by your club with a phone. Not registered with ROTRA yet',
  guest: 'Guest, no ROTRA profile',
  pending: 'Profile lookup after the session syncs',
}

/**
 * A player's profile on operator screens, opened from any player picture: the header-less banner
 * profile card (D-PARTICIPANT-PROFILE) with the name block (display name, new-tab icon, full name,
 * Copy RTR ID), the identity chip and level badge, the identity line, the status pill while live,
 * boxed About, Latest stats and In your club, then the guest invite and the levels note. Never shows
 * a phone number.
 */
export function PlayerProfileSheet({
  open,
  onOpenChange,
  name,
  photoUrl,
  identity,
  nickname,
  level,
  tonightLevel,
  tonight,
  onPhotoClick,
  bannerKey,
  bannerImageUrl,
  registeredCity,
  rtrId,
  profileHref,
  year,
  stats,
  statsLoading = false,
  addedLabel,
  sessionsHere,
  phoneHidden,
  joinedVia = null,
  backLabel,
  onBack,
  onInvite,
  onEdit,
  onDelete,
  onLinkToSavedPlayer,
  deleting = false,
  inviteUrl,
}: PlayerProfileSheetProps) {
  const canInvite = identity === 'guest' || identity === 'unclaimed'
  const phone = phoneHidden
    ? 'Hidden by player'
    : identity === 'guest'
      ? 'None on file'
      : 'Kept private; confirmed in person when adding them to a session'
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const copyInvite = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast('Invite link copied')
    } catch {
      toast(`Copy this link: ${url}`)
    }
  }
  const shareInvite = async (url: string) => {
    try {
      await navigator.share({ title: 'Register for ROTRA Player', url })
    } catch {
      // Dismissing the share sheet is not an error
    }
  }
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={nickname || name}
      headerless
      footer={
        <>
          {backLabel ? (
            <Button onClick={onBack}>Back to {backLabel}</Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          )}
          {onDelete && !backLabel ? (
            <Button variant="danger" onClick={onDelete} loading={deleting}>
              Delete player
            </Button>
          ) : null}
          {identity === 'guest' && onLinkToSavedPlayer && !backLabel ? (
            <Button onClick={onLinkToSavedPlayer}>Link to saved player…</Button>
          ) : null}
          {canInvite && onEdit ? <Button onClick={onEdit}>Edit details</Button> : null}
          {canInvite && onInvite ? (
            <Button variant="primary" onClick={onInvite}>
              Invite
            </Button>
          ) : null}
        </>
      }
    >
      <ProfileBannerCard
        name={name}
        nickname={nickname}
        rtrId={rtrId}
        profileLink={rtrId && profileHref ? { href: profileHref, newTab: true } : null}
        photoUrl={photoUrl}
        onPhotoClick={onPhotoClick}
        bannerKey={bannerKey}
        bannerImageUrl={bannerImageUrl}
        chips={
          <>
            <IdentityChip identity={identity} />
            <ProfileLevelBadge>
              {tonightLevel
                ? `${levelLabel(tonightLevel)} tonight`
                : level
                  ? `${levelLabel(level)} · suggestion`
                  : 'No level yet'}
            </ProfileLevelBadge>
          </>
        }
        identityLine={STATUS[identity]}
        tonight={tonight}
      >
        <ProfileCardSection label="About">
          <KeyValueList
            items={[
              { label: 'Registered in', value: registeredCity ?? 'Not registered yet' },
              { label: 'Joined', value: JOINED_VIA_TEXT[joinedVia ?? 'club-added'] },
            ]}
          />
        </ProfileCardSection>
        <ProfileStatsSection year={year} stats={stats} loading={statsLoading} />
        <ProfileCardSection label="In your club">
          <KeyValueList
            items={[
              { label: 'Added to club', value: addedLabel },
              { label: 'Sessions here', value: sessionsHere },
              { label: 'Phone', value: phone },
            ]}
          />
        </ProfileCardSection>
        {identity === 'guest' && inviteUrl ? (
          <section className="flex flex-col gap-2" aria-labelledby="invite-to-rotra">
            <h3 id="invite-to-rotra" className="m-0 text-[14px] font-semibold">
              Invite to ROTRA
            </h3>
            <p className="m-0 text-[13px] text-fg2">
              Send this link so they can register for ROTRA Player. Their guest record stays
              unlinked until they accept a separate linking invitation.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void copyInvite(inviteUrl)}>Copy invite link</Button>
              {canShare ? <Button onClick={() => void shareInvite(inviteUrl)}>Share</Button> : null}
            </div>
          </section>
        ) : null}
        <p className="m-0 text-[13px] text-fg2">
          Levels are set per session while preparing a roster, not here.
        </p>
      </ProfileBannerCard>
    </Sheet>
  )
}
