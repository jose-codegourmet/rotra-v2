'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateLicenseQueries } from './adminCache'
import { getLicenseOperation } from './fetchers'
import { licenseKeys } from './queryKeys'

/**
 * D-LICENSE › Check status after a lost reply: mutate(sourceCommandId) resolves to the term that
 * command recorded ("nothing was added twice"), or null when it wasn't saved and can be saved again.
 */
export function useCheckLicenseOperation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (sourceCommandId: string) => getLicenseOperation(sourceCommandId),
    networkMode: 'always',
    retry: false,
    onSuccess: (operation, sourceCommandId) => {
      client.setQueryData(licenseKeys.operation(sourceCommandId), operation)
      return operation ? invalidateLicenseQueries(client) : undefined
    },
  })
}
