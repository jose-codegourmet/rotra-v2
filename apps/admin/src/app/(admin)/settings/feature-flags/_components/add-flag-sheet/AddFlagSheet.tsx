'use client'

import { useAddFeatureFlag } from '@rotra/data/feature-flag/useAddFeatureFlag'
import { useFeatureFlags } from '@rotra/data/feature-flag/useFeatureFlags'
import { AddFlagForm } from '@rotra/ui/add-flag-form'
import type { AddFlagFormValues } from '@rotra/ui/add-flag-form/schema'
import { Sheet } from '@rotra/ui/sheet'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useMemo, useRef } from 'react'

export type AddFlagSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * A-ADD-FLAG: the Add feature flag sheet over useAddFeatureFlag. AddFlagForm checks the name and key
 * against the flags already listed (useFeatureFlags); the fetcher checks again at commit. Success
 * closes the sheet and toasts the new flag's value; a failure keeps the sheet and every typed value,
 * with the reason under the form and an error toast. While adding nothing closes it.
 */
export function AddFlagSheet({ open, onOpenChange }: AddFlagSheetProps) {
  const flags = useFeatureFlags()
  const add = useAddFeatureFlag()
  // A second tap can land before isPending re-renders; this keeps it to one request.
  const sending = useRef(false)
  const { reset } = add

  // Every opening starts clean: no error from an earlier attempt.
  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const takenNames = useMemo(() => flags.data?.map((flag) => flag.name), [flags.data])
  const takenKeys = useMemo(() => flags.data?.map((flag) => flag.key), [flags.data])

  const close = () => {
    if (add.isPending) return
    onOpenChange(false)
  }

  const submit = (values: AddFlagFormValues) => {
    if (add.isPending || sending.current) return
    sending.current = true
    add.mutate(values, {
      onSettled: () => {
        sending.current = false
      },
      onSuccess: (flag) => {
        onOpenChange(false)
        toast(`${flag.name} added. It's ${flag.on ? 'on' : 'off'}.`)
      },
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
      title="Add feature flag"
      hideClose={add.isPending}
      dismissible={!add.isPending}
    >
      <AddFlagForm
        takenNames={takenNames}
        takenKeys={takenKeys}
        onSubmit={submit}
        onCancel={close}
        isPending={add.isPending}
        serverError={add.error?.message}
      />
    </Sheet>
  )
}
