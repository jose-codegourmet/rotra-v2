'use client'

import { playerOrigin, queueSessionUrl } from '@rotra/data/public-session/context'
import { useSendJoinRequest } from '@rotra/data/public-session/useSendJoinRequest'
import { JoinRequestForm } from '@rotra/ui/forms/join-request-form'
import type {
  JoinRequestFormInput,
  JoinRequestFormValues,
} from '@rotra/ui/forms/join-request-form/schema'
import { Sheet } from '@rotra/ui/sheet'
import { toast } from '@rotra/ui/toaster'
import { useCallback, useEffect, useState } from 'react'

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
  const origin = playerOrigin(location.origin)
  const back = new URL(location.href)
  back.searchParams.set('join', '1')
  const destination = queueSessionUrl(back.href)
  if (!origin || !destination) return undefined
  const login = new URL('/login', origin)
  login.searchParams.set('next', destination)
  return login.href
}

type Draft = { values: JoinRequestFormInput; requestId: string; at: number }
const draftKey = (slug: string) => `rotra-session-request:${slug}`
function readDraft(slug: string): Draft | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(draftKey(slug)) ?? 'null')
    if (
      !saved ||
      typeof saved.at !== 'number' ||
      Date.now() < saved.at ||
      Date.now() - saved.at > 30 * 60_000 ||
      typeof saved.requestId !== 'string' ||
      !saved.values ||
      !['name', 'nickname', 'phone', 'statedBand'].every(
        (key) => typeof saved.values[key] === 'string',
      )
    ) {
      clearDraft(slug)
      return null
    }
    return saved
  } catch {
    return null
  }
}
function clearDraft(slug: string) {
  try {
    sessionStorage.removeItem(draftKey(slug))
  } catch {
    /* optional UI memory */
  }
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
  const [defaultValues, setDefaultValues] = useState<Partial<JoinRequestFormInput>>()
  const saveDraft = useCallback(
    (values: JoinRequestFormInput) => {
      try {
        sessionStorage.setItem(
          draftKey(slug),
          JSON.stringify({ values, requestId, at: Date.now() }),
        )
      } catch {
        /* Drafts are best-effort local UI state, never authorization. */
      }
    },
    [slug, requestId],
  )

  useEffect(() => {
    if (open) {
      const saved = readDraft(slug)
      setDefaultValues(saved?.values)
      setOpened((n) => n + 1)
      setRequestId(saved?.requestId ?? crypto.randomUUID())
      setServerError(undefined)
    }
  }, [open, slug])

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
          clearDraft(slug)
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
        if (!send.isPending) {
          if (!next) clearDraft(slug)
          onOpenChange(next)
        }
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
        onCancel={() => {
          clearDraft(slug)
          onOpenChange(false)
        }}
        defaultValues={defaultValues}
        onValuesChange={saveDraft}
        autoFocus
        playerLoginHref={showPlayerLogin && open ? playerLoginHref() : undefined}
        returned={returned}
      />
    </Sheet>
  )
}
