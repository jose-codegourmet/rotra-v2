'use client'

import { useClub } from '@rotra/data/club'
import { useFacebookPost } from '@rotra/data/club/useFacebookPost'
import { DEMO_CLUB_ID } from '@rotra/data/fixtures/clubs'
import { useQueueSession } from '@rotra/data/queue-session/useQueueSession'
import { SessionJoinQr } from '@rotra/ui/session-join-qr'
import { ShareSessionDialog } from '@rotra/ui/share-session-dialog'
import { Sheet } from '@rotra/ui/sheet'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useRef, useState } from 'react'
import { FacebookPost } from '@/app/(operator)/sessions/[sessionId]/_components/facebook-post/FacebookPost'
import { useAppSelector } from '@/store/hooks'
import { selectAccount } from '@/store/slices/authSlice'

export type ShareSessionProps = {
  sessionId: string
  /** The header Share button's dialog */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `live` (the console's Share): one dialog with the list, the QR images and the link; default is the preparation page's three tiles */
  variant?: 'preparation' | 'live'
}

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const date = (at: number) =>
  new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

/**
 * The header Share button's dialogs: Share this session (ShareSessionDialog). Preparation: its tiles
 * open the Session QR dialog (Share photos) and the Copy Facebook post dialog. Live (the console):
 * one dialog with the Player list (Facebook post text, Copy list), the Session QR card (Post / Story,
 * Download image) and the Invite link. Copy link copies the visitor link (origin + /s/<publicSlug>)
 * and toasts "Session link copied".
 */
export function ShareSession({
  sessionId,
  open,
  onOpenChange,
  variant = 'preparation',
}: ShareSessionProps) {
  const session = useQueueSession(sessionId)
  const clubId = useAppSelector(selectAccount)?.id ?? DEMO_CLUB_ID
  const club = useClub(clubId)
  const [qrOpen, setQrOpen] = useState(false)
  const [postOpen, setPostOpen] = useState(false)
  // The public link is origin + /s/<publicSlug>; the origin is only known in the browser.
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])
  const live = variant === 'live'
  // The live dialog's Player list; only fetched while it is open.
  const post = useFacebookPost(sessionId, live && open)
  const textarea = useRef<HTMLTextAreaElement>(null)

  const s = session.data
  if (!s) return null
  const link = `${origin}/s/${s.publicSlug}`
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Clipboard unavailable (insecure context or denied): show the link so it can be copied by hand.
      toast.error(`Couldn't copy automatically. Copy this link: ${link}`)
      return
    }
    toast(
      s.acceptJoinRequests === false
        ? 'Session link copied · joining is not open yet, guests are told to contact the Queue Master'
        : 'Session link copied',
    )
  }

  const copyList = async () => {
    const text = post.data?.text ?? ''
    if (!text.trim()) return
    try {
      await navigator.clipboard.writeText(text)
      toast('Facebook post copied')
    } catch {
      textarea.current?.focus()
      textarea.current?.select()
      toast('Text selected. Copy it with your keyboard or long-press')
    }
  }
  const card = {
    slug: s.publicSlug,
    clubName: club.data?.name ?? 'ROTRA session',
    clubInitials: club.data?.initials,
    clubLogoUrl: club.data?.logoUrl,
    sessionTitle: s.title,
    dateLabel: date(s.scheduledStartAt),
    timeLabel: `${time(s.scheduledStartAt)}–${time(s.scheduledEndAt)}`,
    venueName: s.venueName,
    onDownloaded: () => toast('QR image downloaded'),
    onError: (message: string) => toast.error(message),
  }

  if (live)
    return (
      <ShareSessionDialog
        variant="live"
        open={open}
        onOpenChange={onOpenChange}
        link={link}
        onCopyLink={() => void copyLink()}
        postText={post.data?.text ?? ''}
        playerCount={post.data?.playerCount ?? 0}
        onCopyList={() => void copyList()}
        textareaRef={textarea}
        loading={open && (post.isPending || post.isFetching)}
        error={
          post.isError
            ? `Couldn't fill in the post. ${post.error instanceof Error ? post.error.message : 'Try again.'}`
            : undefined
        }
        onRetry={() => void post.refetch()}
        card={card}
      />
    )

  return (
    <>
      <ShareSessionDialog
        open={open}
        onOpenChange={onOpenChange}
        link={link}
        onSharePhotos={() => {
          onOpenChange(false)
          setQrOpen(true)
        }}
        onCopyLink={() => void copyLink()}
        onFacebookPost={() => {
          onOpenChange(false)
          setPostOpen(true)
        }}
      />
      <Sheet open={qrOpen} onOpenChange={setQrOpen} title="Session QR">
        {/* The QR holds the visitor link (/s/<slug>), never the public-page preview URL. */}
        <SessionJoinQr link={link} {...card} />
      </Sheet>
      <FacebookPost sessionId={sessionId} open={postOpen} onOpenChange={setPostOpen} />
    </>
  )
}
