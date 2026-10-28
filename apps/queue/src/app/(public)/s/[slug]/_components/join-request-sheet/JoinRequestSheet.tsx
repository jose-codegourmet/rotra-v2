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
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.'

/**
 * Q-PUBLIC-JOIN › Request to join: Foundation Sheet + JoinRequestForm, sent with
 * useSendJoinRequest. Success closes the sheet and toasts "Request sent"; the page's card then
 * shows the sent status. A failure keeps the sheet open with serverError and what was typed.
 */
export function JoinRequestSheet({ slug, sessionLine, open, onOpenChange }: JoinRequestSheetProps) {
  const send = useSendJoinRequest(slug)
  const [serverError, setServerError] = useState<string>()
  // Bumped on every open: a fresh, empty form.
  const [opened, setOpened] = useState(0)

  useEffect(() => {
    if (open) {
      setOpened((n) => n + 1)
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
      />
    </Sheet>
  )
}
