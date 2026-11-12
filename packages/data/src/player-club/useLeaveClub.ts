'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clubPageKeys } from '../club-page/queryKeys'
import { leaveClub } from './fetchers'
import { playerClubKeys } from './queryKeys'
/** Leave club from the club page (#766): refreshes the player's clubs and that club page. */
export function useLeaveClub() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: leaveClub,
    networkMode: 'always',
    onSuccess: (result) =>
      Promise.all([
        client.invalidateQueries({ queryKey: playerClubKeys.player(result.playerId) }),
        client.invalidateQueries({ queryKey: clubPageKeys.page(result.clubId) }),
      ]),
  })
}
