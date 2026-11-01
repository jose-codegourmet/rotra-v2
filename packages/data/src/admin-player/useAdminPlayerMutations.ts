'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  changeAdminPlayers,
  createAdminPlayer,
  issueRegistrationLink,
  updateAdminPlayer,
} from './mutations'
/** All projections share the mock store; invalidate active queries after any identity change. */
export function useAdminPlayerMutations() {
  const client = useQueryClient()
  const onSuccess = () => client.invalidateQueries()
  return {
    create: useMutation({ mutationFn: createAdminPlayer, onSuccess }),
    update: useMutation({ mutationFn: updateAdminPlayer, onSuccess }),
    change: useMutation({ mutationFn: changeAdminPlayers, onSuccess }),
    link: useMutation({ mutationFn: issueRegistrationLink, onSuccess }),
  }
}
