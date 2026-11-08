'use client'
import { useMutation } from '@tanstack/react-query'
import { useMockMutation } from '../mock/query'
import { deleteClubPlayer, getDeleteImpact } from './delete'

/** Delete player: `check` reads the impact (no refetch), `remove` deletes and refreshes lists. */
export function useDeleteClubPlayer() {
  return {
    check: useMutation({ mutationFn: getDeleteImpact }),
    remove: useMockMutation(deleteClubPlayer),
  }
}
