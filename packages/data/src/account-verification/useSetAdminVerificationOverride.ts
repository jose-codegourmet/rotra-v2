'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAuditKeys } from '../admin-audit/queryKeys'
import { setAdminVerificationOverride } from '../admin-player/mutations'
import { adminPlayerKeys } from '../admin-player/queryKeys'
import { accountVerificationKeys } from './queryKeys'

export function useSetAdminVerificationOverride() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: setAdminVerificationOverride,
    networkMode: 'always',
    onSuccess: (verification, { playerId }) => {
      client.setQueryData(accountVerificationKeys.admin(playerId), verification)
      return Promise.all([
        client.invalidateQueries({ queryKey: adminPlayerKeys.all }),
        client.invalidateQueries({ queryKey: accountVerificationKeys.owner(playerId) }),
        client.invalidateQueries({ queryKey: adminAuditKeys.all }),
      ])
    },
  })
}
