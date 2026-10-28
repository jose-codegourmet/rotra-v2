'use client'
import { ErrorState } from '@rotra/ui/error-state'
import { useLayoutEffect } from 'react'
import { useAdminWorkspaceAccess } from './_components/admin-workspace-shell/AdminWorkspaceShell'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string; kind?: string }
  reset: () => void
}) {
  const reportPermissionDenied = useAdminWorkspaceAccess()
  const permission = error.kind === 'permission'
  useLayoutEffect(() => {
    if (permission) reportPermissionDenied?.()
  }, [permission, reportPermissionDenied])
  if (permission) return null
  return (
    <ErrorState title="Couldn't load this page." onRetry={reset} retryLabel="Retry">
      Check your connection, then try again.
    </ErrorState>
  )
}
