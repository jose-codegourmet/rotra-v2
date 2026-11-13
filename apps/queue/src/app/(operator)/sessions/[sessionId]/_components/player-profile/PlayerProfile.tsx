'use client'

import { rotraProfileUrl } from '@rotra/data/app-origins'
import { registeredCity } from '@rotra/data/club-player/fetchers'
import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { useClubPlayerYearStats } from '@rotra/data/club-player/useClubPlayerYearStats'
import { useSessionMatches } from '@rotra/data/match/useSessionMatches'
import { statsYear } from '@rotra/data/player/rules'
import { tonightStatus } from '@rotra/data/public-session/rules'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { useSessionRoster } from '@rotra/data/session-roster/useSessionRoster'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { PhotoViewer } from '@rotra/ui/photo-viewer'
import { PlayerProfileSheet } from '@rotra/ui/player-profile-sheet'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { useParams } from 'next/navigation'
import { longDateLabel } from '@/lib/dates'

export type PlayerProfileProps = {
  /** The saved player to show; null keeps the sheet closed */
  clubPlayerId: string | null
  onClose: () => void
  /** Opened from a dialog (Suggested match, Start match, payments): the footer offers Back to it instead of Close */
  backLabel?: 'suggestion' | 'match' | 'payments'
  onBack?: () => void
}

/**
 * The player profile dialog shared by the console views: PlayerProfileSheet on useClubPlayers for
 * the saved player a court, queue card, pool card or leaderboard row points at, with the session's
 * roster level (“LEVEL tonight”) while the session is prepared or live, the status pill while it is
 * live, and Stats · YEAR (D-PARTICIPANT-PROFILE). Renders nothing until the player is known.
 */
export function PlayerProfile({ clubPlayerId, onClose, backLabel, onBack }: PlayerProfileProps) {
  const { sessionId = '' } = useParams<{ sessionId?: string }>()
  const clubPlayers = useClubPlayers()
  const session = useQueueSession(sessionId)
  const roster = useSessionRoster(sessionId)
  const matches = useSessionMatches(sessionId)
  const photo = usePhotoViewer()
  const stats = useClubPlayerYearStats(clubPlayerId)
  const profile = clubPlayerId
    ? clubPlayers.data?.players.find((p) => p.id === clubPlayerId)
    : undefined
  if (!profile) return null
  const entry = roster.data?.roster.find((r) => r.clubPlayerId === profile.id)
  const state = session.data?.state
  const live = state === 'prepared' || state === 'active' || state === 'finalizing'
  // The status pill shows only while the session is live (not prepared, not after Session done).
  const tonight =
    entry && state === 'active' && matches.data && session.data
      ? tonightStatus(entry, matches.data, session.data.courts, session.data.startedAt)
      : null
  const photoUrl = profilePictureSrc(
    profile.picture,
    profile.playerId ?? profile.id,
    profile.pictureName ?? profile.fullName,
  )
  return (
    <>
      <PlayerProfileSheet
        open={clubPlayerId !== null}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        name={profile.fullName}
        photoUrl={photoUrl}
        onPhotoClick={
          photoUrl ? () => photo.show({ src: photoUrl, name: profile.fullName }) : undefined
        }
        bannerKey={profile.bannerKey}
        bannerImageUrl={profile.bannerImageUrl}
        identity={profile.identity}
        nickname={profile.nickname}
        level={profile.suggestion}
        tonightLevel={live ? entry?.level : null}
        tonight={tonight}
        registeredCity={registeredCity(profile.rtrId)}
        rtrId={profile.rtrId}
        profileHref={profile.rtrId ? rotraProfileUrl(profile.rtrId) : null}
        year={statsYear(Date.now())}
        stats={stats.data ?? null}
        statsLoading={stats.isPending}
        addedLabel={longDateLabel(profile.addedAt)}
        sessionsHere={profile.sessionsHere}
        phoneHidden={profile.phoneHidden}
        backLabel={backLabel}
        onBack={onBack}
      />
      {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
    </>
  )
}
