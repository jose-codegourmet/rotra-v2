'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { playerKeys } from '../player/queryKeys'
import { setStatsVisibility } from './visibilitySettings'
/** Saves Show my profile stats / Show my weekly performance; profile reads refetch once confirmed. */
export function useSetStatsVisibility() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: setStatsVisibility,
    networkMode: 'always',
    onSuccess: () => client.invalidateQueries({ queryKey: playerKeys.all }),
  })
}
