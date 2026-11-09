'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { joinClub } from './fetchers'
import { playerClubKeys } from './queryKeys'
export function useJoinClub() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: joinClub,
    networkMode: 'always',
    onSuccess: (result) =>
      client.invalidateQueries({ queryKey: playerClubKeys.mine(result.playerId) }),
  })
}
