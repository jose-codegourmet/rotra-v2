'use client'
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import type { AdminPlayerEditInput, AdminPlayerEditResult } from './adminPlayer.types'
import {
  changeAdminPlayers,
  createAdminPlayer,
  issueRegistrationLink,
  updateAdminPlayer,
} from './mutations'

/** What the mutation cache holds for a save: everything except the password. */
type EditVariables = Omit<AdminPlayerEditInput, 'password'>

/** Save changes, with the password kept out of TanStack Query's mutation state. */
export type AdminPlayerEditMutation = Omit<
  UseMutationResult<AdminPlayerEditResult, Error, EditVariables>,
  'mutate' | 'mutateAsync'
> & {
  mutate: (input: AdminPlayerEditInput) => void
  mutateAsync: (input: AdminPlayerEditInput) => Promise<AdminPlayerEditResult>
}

/**
 * A-PLAYER-EDIT › Save changes. The password *(for MVP or beta only)* is handed to the save through
 * a ref and cleared at once, so it never sits in the mutation's `variables` (the query cache), and
 * the mutation is dropped from the cache as soon as nothing observes it.
 */
export function useEditAdminPlayer(onSuccess: () => unknown): AdminPlayerEditMutation {
  const password = useRef('')
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: (variables: EditVariables) => {
      const secret = password.current
      password.current = ''
      return updateAdminPlayer({ ...variables, password: secret })
    },
    onSuccess,
  })
  const split = ({ password: secret, ...variables }: AdminPlayerEditInput) => {
    password.current = secret
    return variables
  }
  return {
    ...mutation,
    mutate: (input) => mutation.mutate(split(input)),
    mutateAsync: (input) => mutation.mutateAsync(split(input)),
  }
}

/** All projections share the mock store; invalidate active queries after any identity change. */
export function useAdminPlayerMutations() {
  const client = useQueryClient()
  const onSuccess = () => client.invalidateQueries()
  return {
    create: useMutation({ mutationFn: createAdminPlayer, onSuccess }),
    update: useEditAdminPlayer(onSuccess),
    change: useMutation({ mutationFn: changeAdminPlayers, onSuccess }),
    link: useMutation({ mutationFn: issueRegistrationLink, onSuccess }),
  }
}
