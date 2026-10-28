import type { ReactNode } from 'react'
import { AdminWorkspaceShell } from './_components/admin-workspace-shell/AdminWorkspaceShell'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminWorkspaceShell>{children}</AdminWorkspaceShell>
}
