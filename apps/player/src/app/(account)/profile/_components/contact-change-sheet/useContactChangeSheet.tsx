'use client'
import { OPEN_CONTACT_CHANGE_STATUSES } from '@rotra/data/contact-change-request/types'
import { useMyContactChangeRequest } from '@rotra/data/contact-change-request/useMyContactChangeRequest'
import { useSubmitContactChangeRequest } from '@rotra/data/contact-change-request/useSubmitContactChangeRequest'
import { MockError } from '@rotra/data/mock/errors'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { ContactChangeRequestForm } from '@rotra/ui/contact-change-request-form'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'

const IN_PROGRESS = 'You already have a request in progress'

/**
 * P-CONTACT-REQUEST, shared by Privacy and contact and Edit profile: openSheet() opens the request
 * sheet, or toasts instead while a request is open. Render `sheet` once on the page.
 */
export function useContactChangeSheet(playerId: string | null) {
  const account = useMyAccount(playerId)
  const request = useMyContactChangeRequest(playerId)
  const submit = useSubmitContactChangeRequest()
  const [open, setOpen] = useState(false)
  const [fieldError, setFieldError] = useState<string>()
  const [serverError, setServerError] = useState<string>()
  const hasOpenRequest = Boolean(
    request.data && OPEN_CONTACT_CHANGE_STATUSES.includes(request.data.status),
  )
  const close = () => {
    setOpen(false)
    setFieldError(undefined)
    setServerError(undefined)
  }
  const openSheet = () => {
    if (hasOpenRequest) {
      toast(IN_PROGRESS)
      return
    }
    setFieldError(undefined)
    setServerError(undefined)
    setOpen(true)
  }
  const sheet = account.data ? (
    <ContactChangeRequestForm
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      currentPhone={account.data.phone}
      currentEmail={account.data.email}
      isPending={submit.isPending}
      fieldError={fieldError}
      serverError={serverError}
      onCancel={close}
      onSubmit={(values) => {
        setFieldError(undefined)
        setServerError(undefined)
        submit.mutate(values, {
          onSuccess: () => {
            close()
            toast('Request sent for review')
          },
          onError: (error) => {
            if (error instanceof MockError && error.message === 'request-open') {
              close()
              toast(IN_PROGRESS)
              return
            }
            const onField = error instanceof MockError ? error.fieldErrors?.toValue : undefined
            if (onField) setFieldError(onField)
            else setServerError(error.message)
          },
        })
      }}
    />
  ) : null
  return { openSheet, sheet, request, hasOpenRequest }
}
