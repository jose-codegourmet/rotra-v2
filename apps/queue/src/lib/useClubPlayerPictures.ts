'use client'

import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { profilePictureSrc } from '@rotra/ui/profile-picture'

/**
 * The saved player's own picture (or character) by club player id, as the live console draws it
 * (Queue tab, On court, Players view): the Record page's tabs use it for faces on the replay,
 * the match cards, the Players cards and the Payments checklist. `undefined` means initials.
 */
export function useClubPlayerPictures() {
  const clubPlayers = useClubPlayers()
  const pictureOf = (clubPlayerId: string | undefined | null): string | undefined => {
    const p = clubPlayerId
      ? clubPlayers.data?.players.find((x) => x.id === clubPlayerId)
      : undefined
    return p
      ? profilePictureSrc(p.picture, p.playerId ?? p.id, p.pictureName ?? p.fullName)
      : undefined
  }
  return { pictureOf }
}
