'use client'

import { registeredCity } from '@rotra/data/club-player/fetchers'
import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { PlayerProfileSheet } from '@rotra/ui/player-profile-sheet'
import { longDateLabel } from '@/lib/dates'

export type PlayerProfileProps = {
  /** The saved player to show; null keeps the sheet closed */
  clubPlayerId: string | null
  onClose: () => void
}

/**
 * The player profile dialog shared by the console views: PlayerProfileSheet on useClubPlayers for
 * the saved player a court, queue card, pool card or leaderboard row points at. Renders nothing
 * until the player is known.
 */
export function PlayerProfile({ clubPlayerId, onClose }: PlayerProfileProps) {
  const clubPlayers = useClubPlayers()
  const profile = clubPlayerId
    ? clubPlayers.data?.players.find((p) => p.id === clubPlayerId)
    : undefined
  if (!profile) return null
  return (
    <PlayerProfileSheet
      open={clubPlayerId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      name={profile.fullName}
      identity={profile.identity}
      nickname={profile.nickname}
      level={profile.suggestion}
      registeredCity={registeredCity(profile.rtrId)}
      rtrId={profile.rtrId}
      addedLabel={longDateLabel(profile.addedAt)}
      sessionsHere={profile.sessionsHere}
      phoneHidden={profile.phoneHidden}
    />
  )
}
