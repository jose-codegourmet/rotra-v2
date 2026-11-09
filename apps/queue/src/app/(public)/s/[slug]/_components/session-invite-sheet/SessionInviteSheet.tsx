'use client'

import { useSessionInviteCode } from '@rotra/data/public-session/useSessionInviteCode'
import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'
import { SessionInviteCard } from '@rotra/ui/share-card'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'

export type SessionInviteSheetProps = {
  slug: string
  playerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  inviterName: string
  inviterAvatarUrl?: string | null
  clubName: string
  clubInitials?: string
  clubLogoUrl?: string | null
  sessionTitle: string
  /** "Sun, Oct 26" */
  dateLabel: string
  /** "7:30 PM–10:30 PM" */
  timeLabel: string
  venueName: string
  /** The session is full: the QR caption reads "Waitlist open" */
  waitlistOpen: boolean
}

/**
 * Q-PUBLIC-JOIN › Invite › Session invite: a Sheet around SessionInviteCard. The player's code is
 * made the first time the sheet opens (useSessionInviteCode) and the link carries it as
 * /s/<slug>?invite=<code>. Footer: Close; Share or Download image come from the card.
 */
export function SessionInviteSheet({
  slug,
  playerId,
  open,
  onOpenChange,
  inviterName,
  inviterAvatarUrl,
  clubName,
  clubInitials,
  clubLogoUrl,
  sessionTitle,
  dateLabel,
  timeLabel,
  venueName,
  waitlistOpen,
}: SessionInviteSheetProps) {
  const invite = useSessionInviteCode(slug, playerId, open)
  const code = invite.data?.code
  const link =
    code && typeof location !== 'undefined'
      ? `${location.origin}/s/${encodeURIComponent(slug)}?invite=${encodeURIComponent(code)}`
      : null

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Session invite"
      footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}
    >
      {link ? (
        <SessionInviteCard
          link={link}
          slug={slug}
          inviterName={inviterName}
          inviterAvatarUrl={inviterAvatarUrl}
          clubName={clubName}
          clubInitials={clubInitials}
          clubLogoUrl={clubLogoUrl}
          sessionTitle={sessionTitle}
          dateLabel={dateLabel}
          timeLabel={timeLabel}
          venueName={venueName}
          waitlistOpen={waitlistOpen}
          onShared={() => toast('Share sheet opened')}
          onError={(message) => toast.error(message)}
        />
      ) : invite.isError ? (
        <Notice tone="error">{invite.error.message}</Notice>
      ) : (
        <div
          role="status"
          aria-busy
          aria-label="Making your invite"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      )}
    </Sheet>
  )
}
