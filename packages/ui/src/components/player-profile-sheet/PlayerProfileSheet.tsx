'use client'

import type { PlayingLevel } from '@rotra/data/player/types'
import type { ParticipantStats, ParticipantTonight } from '@rotra/data/public-session/types'
import { Button } from '@rotra/ui/button'
import { IdentityChip } from '@rotra/ui/identity-chip'
import type { Identity } from '@rotra/ui/identity-chip/variants'
import { KeyValueList } from '@rotra/ui/key-value-list'
import { levelLabel } from '@rotra/ui/level-pill'
import { Notice } from '@rotra/ui/notice'
import {
  ProfileBannerCard,
  ProfileCardSection,
  ProfileLevelBadge,
  ProfileStatsSection,
} from '@rotra/ui/profile-banner-card'
import { JOINED_VIA_TEXT } from '@rotra/ui/saved-player-card'
import { Sheet } from '@rotra/ui/sheet'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'

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
  /** false when the player turned off Show my profile stats: Latest stats is left out. Default true. */
  showStats?: boolean
  /** Long date the club saved them, e.g. "October 3, 2026" */
  addedLabel: string
  sessionsHere: number
  /** The player hid their phone. The number itself is never passed to this component */
  phoneHidden: boolean
  /** An unclaimed player saved with no phone reads "None on file"; omitted means one is on file */
  phoneOnFile?: boolean
  /**
   * The club has an email for them (guests and unclaimed players): the Email row reads "On file
   * and kept private" or "None on file". The address itself is never passed. Registered players
   * have no Email row.
   */
  emailOnFile?: boolean
  /** An older unclaimed record with no email: the warn chip, the notice and the reworded status line */
  detailsRequired?: boolean
  /** How they joined; null or absent reads "Added by the club" */
  joinedVia?: 'club' | 'session' | null
  /** Opened from a dialog: the footer offers Back to that dialog instead of Close */
  backLabel?: 'suggestion' | 'match' | 'payments'
  onBack?: () => void
  /**
   * Registered players only: the club's own nickname for them. Passing it (null for none) adds the
   * Club nickname row under In your club: “NICK” · only your club sees it, or "None".
   */
  clubNickname?: string | null
  /** Registered players only: the Club nickname button; hidden when opened from another dialog */
  onClubNickname?: () => void
  /** Shown for guests and unclaimed profiles */
  onInvite?: () => void
  /** Edit details, shown for guests and unclaimed profiles (a registered player owns their details) */
  onEdit?: () => void
  /** Delete player, any saved player; hidden when opened from another dialog */
  onDelete?: () => void
  /** The delete is being checked or saved */
  deleting?: boolean
  /**
   * Makes the guest's own invite link (absolute ROTRA Player URL): registering through it claims this
   * record (D-2026-11-18-07). Guests get an Invite to ROTRA section; hidden when absent. Called on
   * each Copy invite link or Share tap: return the same link while the profile stays open, since
   * making a new link cancels the earlier one. A rejection shows its message as an error toast.
   */
  getInviteLink?: () => Promise<string>
}

const STATUS: Record<Identity, string> = {
  registered: 'Registered ROTRA player',
  unclaimed: 'Saved by your club with their email. Not registered with ROTRA yet',
  guest: 'Guest, no ROTRA profile',
  pending: 'Profile lookup after the session syncs',
}

/**
 * A player's profile on operator screens, opened from any player picture: the header-less banner
 * profile card (D-PARTICIPANT-PROFILE) with the name block (display name, new-tab icon, full name,
 * Copy RTR ID), the identity chip and level badge, the identity line, the status pill while live,
 * boxed About, Latest stats and In your club, then the guest invite and the levels note. Never shows
 * a phone number or an email address.
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
  showStats = true,
  addedLabel,
  sessionsHere,
  phoneHidden,
  phoneOnFile = true,
  emailOnFile = false,
  detailsRequired: detailsRequiredProp = false,
  joinedVia = null,
  backLabel,
  onBack,
  clubNickname,
  onClubNickname,
  onInvite,
  onEdit,
  onDelete,
  deleting = false,
  getInviteLink,
}: PlayerProfileSheetProps) {
  const [linking, setLinking] = useState<'copy' | 'share' | null>(null)
  const canInvite = identity === 'guest' || identity === 'unclaimed'
  const detailsRequired = detailsRequiredProp && identity === 'unclaimed'
  // #1019: an unclaimed player saved with a social link and no email.
  const statusLine = detailsRequired
    ? 'Saved by your club with a phone and no email. Not registered with ROTRA yet'
    : identity === 'unclaimed' && !emailOnFile
      ? 'Saved by your club with a social link. Not registered with ROTRA yet'
      : STATUS[identity]
  const phone = phoneHidden
    ? 'Hidden by player'
    : identity === 'guest' || !phoneOnFile
      ? 'None on file'
      : 'Kept private; confirmed in person when adding them to a session'
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  /** The link, or the reason it could not be made (offline, the player was deleted). */
  const settle = (link: Promise<string>) =>
    link.then(
      (url) => ({ url, error: null }),
      (error: unknown) => ({
        url: null,
        error: error instanceof Error ? error.message : "Couldn't make the invite link. Try again.",
      }),
    )
  const copyInvite = async (makeLink: () => Promise<string>) => {
    setLinking('copy')
    const link = makeLink()
    try {
      // The write starts in the tap itself and waits for the link inside it: Safari refuses a
      // clipboard write that only starts after waiting.
      if (typeof ClipboardItem === 'undefined')
        await link.then((url) => navigator.clipboard.writeText(url))
      else
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': link.then((url) => new Blob([url], { type: 'text/plain' })),
          }),
        ])
      toast('Invite link copied')
    } catch {
      const made = await settle(link)
      if (made.url) toast(`Copy this link: ${made.url}`)
      else toast.error(made.error ?? '')
    } finally {
      setLinking(null)
    }
  }
  const shareInvite = async (makeLink: () => Promise<string>) => {
    setLinking('share')
    const made = await settle(makeLink())
    setLinking(null)
    if (!made.url) {
      toast.error(made.error ?? '')
      return
    }
    try {
      await navigator.share({ title: 'Register for ROTRA Player', url: made.url })
    } catch (error) {
      // Dismissing the share sheet is not an error; a browser that refused to open it shows the link
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        toast(`Copy this link: ${made.url}`)
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
          {identity === 'registered' && onClubNickname && !backLabel ? (
            <Button onClick={onClubNickname}>Club nickname</Button>
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
            <IdentityChip identity={identity} detailsRequired={detailsRequired} />
            <ProfileLevelBadge>
              {tonightLevel
                ? `${levelLabel(tonightLevel)} tonight`
                : level
                  ? `${levelLabel(level)} · suggestion`
                  : 'No level yet'}
            </ProfileLevelBadge>
          </>
        }
        identityLine={statusLine}
        tonight={tonight}
      >
        {detailsRequired ? (
          <Notice tone="warn" title="Details required.">
            An unclaimed player needs an email. Add their email in Edit details, or delete the
            player.
          </Notice>
        ) : null}
        <ProfileCardSection label="About">
          <KeyValueList
            items={[
              { label: 'Registered in', value: registeredCity ?? 'Not registered yet' },
              { label: 'Joined', value: JOINED_VIA_TEXT[joinedVia ?? 'club-added'] },
            ]}
          />
        </ProfileCardSection>
        {showStats ? (
          <ProfileStatsSection year={year} stats={stats} loading={statsLoading} />
        ) : null}
        <ProfileCardSection label="In your club">
          <KeyValueList
            items={[
              { label: 'Added to club', value: addedLabel },
              { label: 'Sessions here', value: sessionsHere },
              { label: 'Phone', value: phone },
              ...(identity === 'registered' && clubNickname !== undefined
                ? [
                    {
                      label: 'Club nickname',
                      value: clubNickname ? `“${clubNickname}” · only your club sees it` : 'None',
                    },
                  ]
                : []),
              ...(identity === 'registered'
                ? []
                : [
                    {
                      label: 'Email',
                      value: emailOnFile ? 'On file and kept private' : 'None on file',
                    },
                  ]),
            ]}
          />
        </ProfileCardSection>
        {identity === 'guest' && getInviteLink ? (
          <section className="flex flex-col gap-2" aria-labelledby="invite-to-rotra">
            <h3 id="invite-to-rotra" className="m-0 text-[14px] font-semibold">
              Invite to ROTRA
            </h3>
            <p className="m-0 text-[13px] text-fg2">
              Send this link so they can register for ROTRA Player. This record becomes theirs when
              they register: their games here stay with them. The link works once and lasts 7 days.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void copyInvite(getInviteLink)}
                loading={linking === 'copy'}
                disabled={linking === 'share'}
              >
                Copy invite link
              </Button>
              {canShare ? (
                <Button
                  onClick={() => void shareInvite(getInviteLink)}
                  loading={linking === 'share'}
                  disabled={linking === 'copy'}
                >
                  Share
                </Button>
              ) : null}
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
