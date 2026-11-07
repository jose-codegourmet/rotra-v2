'use client'

import { isPermissionRefusal } from '@rotra/data/mock/errors'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { PublicPreviewBanner } from '@rotra/ui/public-preview-banner'
import { toast } from '@rotra/ui/toaster'
import { notFound, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PublicSession } from '@/app/(public)/s/[slug]/_components/public-session/PublicSession'
import { sessionHref } from '@/lib/dates'

export type PublicPagePreviewProps = { sessionId: string }

/**
 * The operator's preview of the public session page: PublicPreviewBanner over the same
 * PublicSession container the /s/[slug] route renders, without the operator shell. The banner
 * carries the shareable visitor link (origin + /s/<slug>) with Copy link, because this preview
 * address only works for the owning club (#469). Back to Queue app returns to the console (active),
 * the session record (completed or invalid) or the preparation (prepared).
 */
export function PublicPagePreview({ sessionId }: PublicPagePreviewProps) {
  const router = useRouter()
  const session = useQueueSession(sessionId)
  // The origin is only known in the browser.
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])

  if (session.isError && isPermissionRefusal(session.error)) notFound()

  const s = session.data
  const sessionLink = s && origin ? `${origin}/s/${s.publicSlug}` : undefined
  const copyLink = async () => {
    if (!sessionLink) return
    try {
      await navigator.clipboard.writeText(sessionLink)
    } catch {
      // Clipboard unavailable (insecure context or denied): show the link so it can be copied by hand.
      toast.error(`Couldn't copy automatically. Copy this link: ${sessionLink}`)
      return
    }
    toast('Session link copied')
  }
  return (
    <>
      <PublicPreviewBanner
        onBack={() => router.push(s ? sessionHref(s) : '/')}
        sessionLink={sessionLink}
        onCopyLink={() => void copyLink()}
      />
      {s ? <PublicSession slug={s.publicSlug} viewer="operator" /> : null}
    </>
  )
}
