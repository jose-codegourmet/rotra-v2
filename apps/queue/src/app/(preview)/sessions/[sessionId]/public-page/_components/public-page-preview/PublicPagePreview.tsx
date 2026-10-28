'use client'

import { MockError } from '@rotra/data/mock/errors'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { PublicPreviewBanner } from '@rotra/ui/public-preview-banner'
import { notFound, useRouter } from 'next/navigation'
import { PublicSession } from '@/app/(public)/s/[slug]/_components/public-session/PublicSession'
import { sessionHref } from '@/lib/dates'

export type PublicPagePreviewProps = { sessionId: string }

/**
 * The operator's preview of the public session page: PublicPreviewBanner over the same
 * PublicSession container the /s/[slug] route renders, without the operator shell. Back to Queue
 * app returns to the console (active), the session record (completed or invalid) or the
 * preparation (prepared).
 */
export function PublicPagePreview({ sessionId }: PublicPagePreviewProps) {
  const router = useRouter()
  const session = useQueueSession(sessionId)

  if (session.isError && session.error instanceof MockError && session.error.kind === 'permission')
    notFound()

  const s = session.data
  return (
    <>
      <PublicPreviewBanner onBack={() => router.push(s ? sessionHref(s) : '/')} />
      {s ? <PublicSession slug={s.publicSlug} viewer="operator" /> : null}
    </>
  )
}
