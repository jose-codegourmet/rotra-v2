'use client'

import { rotraProfileUrl } from '@rotra/data/app-origins'
import { registeredCity } from '@rotra/data/club-player/fetchers'
import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { useClubPlayerYearStats } from '@rotra/data/club-player/useClubPlayerYearStats'
import { statsYear } from '@rotra/data/player/rules'
import { isStatsHidden, visibleStats } from '@rotra/data/public-session/rules'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { PhotoViewer } from '@rotra/ui/photo-viewer'
import { PlayerProfileSheet } from '@rotra/ui/player-profile-sheet'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { longDateLabel } from '@/lib/dates'

export type LeaderboardProfileProps = {
  /** The saved player to show; null keeps the sheet closed */
  clubPlayerId: string | null
  onClose: () => void
  /** Opened from the Podium place dialog: the footer reads Back to place and returns to it */
  onBackToPlace?: () => void
}

/**
 * The club's profile sheet on the Leaderboards page (Q-LEADERBOARDS): PlayerProfileSheet for one of
 * this club's saved players, with Stats · YEAR, outside any session (no tonight level or status).
 */
export function LeaderboardProfile({
  clubPlayerId,
  onClose,
  onBackToPlace,
}: LeaderboardProfileProps) {
  const clubPlayers = useClubPlayers()
  const photo = usePhotoViewer()
  const stats = useClubPlayerYearStats(clubPlayerId)
  const profile = clubPlayerId
    ? clubPlayers.data?.players.find((p) => p.id === clubPlayerId)
    : undefined
  if (!profile) return null
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
        clubNickname={profile.identity === 'registered' ? profile.clubNickname : undefined}
        level={profile.suggestion}
        gender={profile.gender}
        registeredCity={registeredCity(profile.rtrId)}
        rtrId={profile.rtrId}
        profileHref={profile.rtrId ? rotraProfileUrl(profile.rtrId) : null}
        year={statsYear(Date.now())}
        stats={visibleStats(stats.data)}
        showStats={!isStatsHidden(stats.data)}
        statsLoading={stats.isPending}
        addedLabel={longDateLabel(profile.addedAt)}
        sessionsHere={profile.sessionsHere}
        phoneHidden={profile.phoneHidden}
        phoneOnFile={profile.hasPhone}
        emailOnFile={profile.emailOnFile}
        detailsRequired={profile.detailsRequired}
        backLabel={onBackToPlace ? 'place' : undefined}
        onBack={onBackToPlace}
      />
      {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
    </>
  )
}
