'use client'

import { useSignIn } from '@rotra/data/auth/use-sign-in'
import { playerOrigin, queueSessionUrl } from '@rotra/data/public-session/context'
import { useSendJoinRequest } from '@rotra/data/public-session/useSendJoinRequest'
import { isRealDataMode } from '@rotra/data/real/mode'
import { Button } from '@rotra/ui/button'
import { JoinRequestForm } from '@rotra/ui/forms/join-request-form'
import type {
  JoinRequestFormInput,
  JoinRequestFormValues,
} from '@rotra/ui/forms/join-request-form/schema'
import { Notice } from '@rotra/ui/notice'
import { SegmentedControl } from '@rotra/ui/segmented-control'
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
  /** The session's club, for "Register with ROTRA under CLUB" */
  clubName?: string
  /**
   * Real mode: the Player app's registration form under the session's club, returning here
   * (/register/<clubId>?next=<this page>). Missing leaves Register with ROTRA unavailable.
   */
  registerHref?: string
}

type HowToRequest = 'guest' | 'login' | 'register'
const WAYS: { value: HowToRequest; label: string }[] = [
  { value: 'guest', label: 'Continue as guest' },
  { value: 'login', label: 'Log in with ROTRA Player' },
  { value: 'register', label: 'Register with ROTRA' },
]

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
  clubName = 'the club',
  registerHref,
}: JoinRequestSheetProps) {
  const send = useSendJoinRequest(slug)
  const signIn = useSignIn('player')
  const [how, setHow] = useState<HowToRequest>('guest')
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
      setHow('guest')
    }
  }, [open, slug])

  const chooseWay = (next: string) => {
    const choice = WAYS.find((way) => way.value === next)?.value ?? 'guest'
    setHow(choice)
    setServerError(undefined)
    if (choice === 'guest') {
      // The guest form remounts with what was typed before the other choice was picked.
      setDefaultValues(readDraft(slug)?.values)
      setOpened((n) => n + 1)
    }
  }

  // Mock mode: the prototype's "signs you in as a sample ROTRA player"; the page then shows the
  // one-tap join card. Real mode leaves the page for the Player app and comes back signed in.
  const signInAsSample = () =>
    signIn.mutate(
      { identifier: 'demo', password: 'demo' },
      {
        onSuccess: () => {
          clearDraft(slug)
          onOpenChange(false)
        },
        onError: (error) => setServerError(errorMessage(error)),
      },
    )

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

  const loginHref = open && showPlayerLogin ? playerLoginHref() : undefined

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
      {showPlayerLogin ? (
        <SegmentedControl
          aria-label="How to request"
          options={WAYS}
          value={how}
          onChange={chooseWay}
          disabled={send.isPending || signIn.isPending}
          className="mb-3 max-sm:flex max-sm:w-full"
        />
      ) : null}
      {how === 'guest' || !showPlayerLogin ? (
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
          returned={returned}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[13px] text-fg2">{sessionLine}</p>
          <p className="m-0">
            {how === 'login'
              ? 'Log in with ROTRA Player and you come back here signed in, with your request ready to send.'
              : `Register with ROTRA under ${clubName} and you come back here signed in, with your request ready to send.`}
          </p>
          <Notice tone="info">
            Logging in or registering never gives a slot. The Queue Master confirms every request.
          </Notice>
          {serverError ? <Notice tone="error">{serverError}</Notice> : null}
          <div className="flex flex-wrap justify-end gap-2.5 max-sm:grid max-sm:grid-cols-2 max-sm:[&>*]:w-full">
            <Button onClick={() => onOpenChange(false)} disabled={signIn.isPending}>
              Cancel
            </Button>
            {isRealDataMode() ? (
              <Button
                asChild
                variant="primary"
                disabled={how === 'login' ? !loginHref : !registerHref}
              >
                <a href={how === 'login' ? loginHref : registerHref}>
                  {how === 'login' ? 'Log in with ROTRA Player' : 'Register with ROTRA'}
                </a>
              </Button>
            ) : (
              <Button variant="primary" onClick={signInAsSample} loading={signIn.isPending}>
                {how === 'login' ? 'Log in with ROTRA Player' : 'Register with ROTRA'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}
