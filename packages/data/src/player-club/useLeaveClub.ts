'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { leaveClub } from './fetchers'
import { playerClubKeys } from './queryKeys'
export function useLeaveClub() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: leaveClub,
    networkMode: 'always',
    onSuccess: (result) =>
      client.invalidateQueries({ queryKey: playerClubKeys.mine(result.playerId) }),
  })
}
