'use client'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import { appOrigin } from '@rotra/data/app-origins'
import { MockError } from '@rotra/data/mock/errors'
import { reviewPasswordReset } from '@rotra/data/password-reset/fetchers'
import type { ReviewPasswordResetInput } from '@rotra/data/password-reset/types'
import {
  passwordResetKeys,
  usePasswordResetRequests,
} from '@rotra/data/password-reset/usePasswordResetRequests'
import { useThrottledRefresh } from '@rotra/data/refresh/useThrottledRefresh'
import { PasswordResetRequests } from '@rotra/ui/password-reset-requests'
import { PullToRefresh } from '@rotra/ui/pull-to-refresh'
import { Toaster, toast } from '@rotra/ui/toaster'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useDenyOnPermissionError } from '../../../../_components/admin-workspace-shell/AdminWorkspaceShell'

export function PasswordResetRequestsPage() {
  const [page, setPage] = useState(1)
  const [link, setLink] = useState<{ requestId: string; url: string }>()
  const query = usePasswordResetRequests(page)
  const { offline } = useAdminConnectivity()
  // The inbox: pull down (or come back to the tab) refreshes it, once every 10 seconds (mockup change 2026-11-12).
  const refreshing = useThrottledRefresh(() => query.refetch(), { refreshOnReturn: true })
  const cache = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (input: ReviewPasswordResetInput) => {
      setLink(undefined)
      const result = await reviewPasswordReset(input)
      if (result.token)
        setLink({
          requestId: input.id,
          url: `${appOrigin('player')}/reset-password/${encodeURIComponent(result.token)}`,
        })
      // Never return the token to the mutation cache.
    },
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: passwordResetKeys.all })
    },
  })
  const accessError =
    mutation.error instanceof MockError &&
    mutation.error.kind === 'permission' &&
    !mutation.error.fieldErrors
      ? mutation.error
      : null
  const denied = useDenyOnPermissionError(query.error, accessError)
  if (denied) return null
  return (
    <PullToRefresh
      onRefresh={refreshing.refresh}
      throttled={!refreshing.canRefresh}
      offline={offline}
      refreshing={refreshing.isRefreshing}
      updatedLabel={
        query.dataUpdatedAt
          ? new Date(query.dataUpdatedAt).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })
          : undefined
      }
      disabled={mutation.isPending}
    >
      <Toaster />
      <PasswordResetRequests
        data={query.data}
        loading={query.isFetching}
        error={query.error?.message}
        actionError={mutation.error?.message}
        pendingId={mutation.isPending ? mutation.variables.id : undefined}
        link={link}
        onRetry={() => void query.refetch()}
        onPage={(next) => {
          setLink(undefined)
          mutation.reset()
          setPage(next)
        }}
        onReview={(id, action, ownershipVerified) =>
          mutation.mutate({ id, action, ownershipVerified })
        }
        onCopy={(url) => {
          navigator.clipboard.writeText(url).then(
            () => toast.success('Reset link copied.'),
            () => toast.error("Couldn't copy. Select and copy the link."),
          )
        }}
      />
    </PullToRefresh>
  )
}
