'use client'

import { ADMIN_OFFLINE_ERROR } from '@rotra/data/admin-account'
import { useAdminConnectivity } from '@rotra/data/admin-account/use-admin-connectivity'
import { useAddFeatureFlag } from '@rotra/data/feature-flag/useAddFeatureFlag'
import { useFeatureFlags } from '@rotra/data/feature-flag/useFeatureFlags'
import { AddFlagForm } from '@rotra/ui/add-flag-form'
import type { AddFlagFormValues } from '@rotra/ui/add-flag-form/schema'
import { ConfirmSheet } from '@rotra/ui/confirm-sheet'
import { Sheet } from '@rotra/ui/sheet'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useMemo, useRef, useState } from 'react'

export type AddFlagSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * A-ADD-FLAG: the Add feature flag sheet over useAddFeatureFlag. AddFlagForm checks the name and key
 * against the flags already listed (useFeatureFlags); the fetcher checks again at commit. Success
 * closes the sheet and toasts the new flag's value; a failure keeps the sheet and every typed value,
 * with the reason under the form and an error toast. While adding nothing closes it. Closing (Cancel,
 * the close button, Escape or the scrim) with a name, key or description typed asks "Discard this
 * flag?" first. Offline, Add flag sends nothing and says so under the form.
 */
export function AddFlagSheet({ open, onOpenChange }: AddFlagSheetProps) {
  const flags = useFeatureFlags()
  const add = useAddFeatureFlag()
  const { offline } = useAdminConnectivity()
  const [formDirty, setFormDirty] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [offlineError, setOfflineError] = useState<string | null>(null)
  // A second tap can land before isPending re-renders; this keeps it to one request.
  const sending = useRef(false)
  const { reset } = add

  // Every opening starts clean: no error from an earlier attempt.
  useEffect(() => {
    if (open) {
      setFormDirty(false)
      setLeaving(false)
      setOfflineError(null)
      reset()
    }
  }, [open, reset])

  const takenNames = useMemo(() => flags.data?.map((flag) => flag.name), [flags.data])
  const takenKeys = useMemo(() => flags.data?.map((flag) => flag.key), [flags.data])

  const discard = () => {
    if (add.isPending) return
    setLeaving(false)
    onOpenChange(false)
  }

  // rotra-admin.html closeSheet: anything typed asks before it is thrown away.
  const close = () => {
    if (add.isPending) return
    if (formDirty) setLeaving(true)
    else discard()
  }

  const submit = (values: AddFlagFormValues) => {
    if (add.isPending || sending.current) return
    // rotra-admin.html offlineBlock: nothing is sent and every typed value stays.
    if (offline) {
      add.reset()
      setOfflineError(ADMIN_OFFLINE_ERROR)
      return
    }
    setOfflineError(null)
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
        serverError={offlineError ?? add.error?.message}
        onDirtyChange={setFormDirty}
      />
      <ConfirmSheet
        open={open && leaving}
        onOpenChange={(next) => {
          if (!next) setLeaving(false)
        }}
        title="Discard this flag?"
        consequence="Nothing has been saved."
        backLabel="Keep editing"
        onBack={() => setLeaving(false)}
        confirmLabel="Discard"
        onConfirm={discard}
        destructive
      />
    </Sheet>
  )
}
