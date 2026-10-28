'use client'

import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { PageHeader } from '@rotra/ui/page-header'
import type { ReactNode } from 'react'

export type SessionRecoveryScreenProps = { title: string; onBack: () => void; children: ReactNode }
export function SessionRecoveryScreen({ title, onBack, children }: SessionRecoveryScreenProps) {
  return <main className="mx-auto flex max-w-[860px] flex-col gap-5 px-[max(16px,env(safe-area-inset-left,0px))] pt-5 pb-[120px]">
    <Breadcrumb label="Back to session" onClick={onBack} />
    <PageHeader title="Session recovery" description={title} />
    {children}
  </main>
}
