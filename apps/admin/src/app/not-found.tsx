import { Button } from '@rotra/ui/button'
import { EmptyState } from '@rotra/ui/empty-state'
import Link from 'next/link'
import { AdminWorkspaceShell } from './(admin)/_components/admin-workspace-shell/AdminWorkspaceShell'

export default function AdminNotFound() {
  return (
    <AdminWorkspaceShell>
      <EmptyState
        title="Page not found."
        action={
          <Button asChild>
            <Link href="/clubs">Back to clubs</Link>
          </Button>
        }
      >
        This page isn't available.
      </EmptyState>
    </AdminWorkspaceShell>
  )
}
