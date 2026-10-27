import type { ReactNode } from 'react'
import { OperatorShell } from './_components/operator-shell/OperatorShell'

export default function OperatorLayout({ children }: { children: ReactNode }) {
  return <OperatorShell>{children}</OperatorShell>
}
