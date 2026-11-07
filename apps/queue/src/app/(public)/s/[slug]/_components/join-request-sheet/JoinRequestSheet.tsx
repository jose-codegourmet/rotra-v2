'use client'

import { useSendJoinRequest } from '@rotra/data/public-session/useSendJoinRequest'
import { JoinRequestForm } from '@rotra/ui/forms/join-request-form'
import type { JoinRequestFormValues } from '@rotra/ui/forms/join-request-form/schema'
import { Sheet } from '@rotra/ui/sheet'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useState } from 'react'

export type JoinRequestSheetProps = {
  slug: string
  /** "title · date, time · venue" */
  sessionLine: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Back from the ROTRA Player login: shows "You're back" above the guest form */
  returned?: boolean
  /** Offer Log in with ROTRA Player (the visitor's own page only, not the operator preview) */
  showPlayerLogin?: boolean
}

/** ROTRA Player login that returns to this session's Request to join (/login?next=...&join=1). */
function playerLoginHref() {
  if (typeof location === 'undefined') return undefined
  const local = location.hostname === 'localhost'
  const back = new URL(location.pathname, location.origin)
  back.searchParams.set('join', '1')
  const login = new URL('/login', local ? 'http://localhost:9001' : 'https://player.rotra.club')
  login.searchParams.set('next', back.href)
  return login.href
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * Q-PUBLIC-JOIN › Request to join: Foundation Sheet + JoinRequestForm, sent with
 * useSendJoinRequest with one requestId per open sheet. Success closes the sheet and toasts "Request sent"; the page's card then
 * shows the sent status. A failure keeps the sheet open with serverError and what was typed.
 */
export function JoinRequestSheet({
  slug,
  sessionLine,
  open,
  onOpenChange,
  returned = false,
  showPlayerLogin = false,
}: JoinRequestSheetProps) {
  const send = useSendJoinRequest(slug)
  const [serverError, setServerError] = useState<string>()
  // Bumped on every open: a fresh, empty form.
  const [opened, setOpened] = useState(0)
  // One request ID per open sheet: a retry after a lost reply sends the same request.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())

  useEffect(() => {
    if (open) {
      setOpened((n) => n + 1)
      setRequestId(crypto.randomUUID())
      setServerError(undefined)
    }
  }, [open])

  const onSubmit = (values: JoinRequestFormValues) => {
    setServerError(undefined)
    send.mutate(
      {
        name: values.name,
        nickname: values.nickname,
        phone: values.phone,
        statedBand: values.statedBand,
        requestId,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          toast('Request sent')
        },
        onError: (error) => setServerError(errorMessage(error)),
      },
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!send.isPending) onOpenChange(next)
      }}
      title="Request to join"
      dismissible={!send.isPending}
    >
      <JoinRequestForm
        key={opened}
        sessionLine={sessionLine}
        onSubmit={onSubmit}
        isPending={send.isPending}
        serverError={serverError}
        onCancel={() => onOpenChange(false)}
        autoFocus
        playerLoginHref={showPlayerLogin && open ? playerLoginHref() : undefined}
        returned={returned}
      />
    </Sheet>
  )
}
