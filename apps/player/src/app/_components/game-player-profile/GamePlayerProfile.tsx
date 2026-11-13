'use client'
import { registeredCity } from '@rotra/data/club-player/fetchers'
import { countYearCountedWins, statsYear } from '@rotra/data/player/rules'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { usePlayerGames } from '@rotra/data/player/usePlayerGames'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { maskPublicName } from '@rotra/data/public-session/rules'
import { type ClubMemberProfile, ClubMemberProfileSheet } from '@rotra/ui/club-member-profile-sheet'
import type { GameRowPlayer } from '@rotra/ui/game-row'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { levelLabel } from '@rotra/ui/level-pill'
import { PhotoViewer } from '@rotra/ui/photo-viewer'
import { PrivateProfileCard } from '@rotra/ui/private-profile-card'
import { useRouter } from 'next/navigation'
import { pictureSrc } from '../profile-picture/pictureSrc'

/**
 * The profile card a face on a game court opens (2026-11-13 game row log, pass 3): the full card
 * for a ROTRA player, the private card when their profile is hidden from this viewer, and for
 * someone with no ROTRA profile the limited Not on ROTRA yet card.
 */
export function GamePlayerProfile({
  player,
  viewerId,
  onClose,
}: {
  player: GameRowPlayer | null
  /** The signed-in player, for the You chip */
  viewerId?: string | null
  onClose: () => void
}) {
  const router = useRouter()
  const playerId = player?.playerId ?? ''
  const profile = usePlayerProfile(playerId)
  const rank = usePlayerRank(playerId)
  const games = usePlayerGames(playerId)
  const photo = usePhotoViewer()
  if (!player) return null
  const close = (open: boolean) => {
    if (!open) onClose()
  }
  if (!player.playerId)
    return (
      <PrivateProfileCard
        open
        onOpenChange={close}
        variant="guest"
        name={player.name}
        text="This player played as a guest and hasn't registered with ROTRA yet, so there's no profile to show."
      />
    )
  const id = player.playerId
  const picture = pictureSrc(player.picture, id, player.name) ?? null
  const hidden = profile.isError || rank.isError
  let card: ClubMemberProfile
  if (hidden) card = { kind: 'private', name: maskPublicName(player.name), picture }
  else {
    // Latest stats: counted games this calendar year (Asia/Manila), reset on January 1.
    const year = countYearCountedWins(games.data ?? [], Date.now())
    const rtrId = profile.data?.rtrId ?? null
    const levelIndex = rank.data?.levelIndex ?? null
    card = {
      kind: 'public',
      name: profile.data?.fullName ?? player.name,
      nickname: profile.data?.nickname ?? null,
      picture,
      bannerKey: profile.data?.bannerKey,
      bannerImageUrl: profile.data?.bannerImageUrl,
      levelLabel: levelIndex === null ? null : levelLabel(PLAYING_LEVELS[levelIndex] ?? null),
      position: rank.data?.position ?? null,
      isYou: !!viewerId && viewerId === id,
      registeredCity: registeredCity(rtrId),
      rtrId,
      stats: games.data ? { ...year, losses: year.games - year.wins } : null,
    }
  }
  return (
    <>
      <ClubMemberProfileSheet
        open
        onOpenChange={close}
        profile={card}
        year={statsYear(Date.now())}
        loading={!hidden && (games.isPending || profile.isPending)}
        // Show my profile stats off hides Latest stats from everyone but the player.
        showStats={profile.data?.showProfileStats !== false || (!!viewerId && viewerId === id)}
        profileHref={`/players/${id}`}
        onOpenFullProfile={() => router.push(`/players/${id}`)}
        onViewPhoto={picture ? () => photo.show({ src: picture, name: player.name }) : undefined}
      />
      {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
    </>
  )
}
