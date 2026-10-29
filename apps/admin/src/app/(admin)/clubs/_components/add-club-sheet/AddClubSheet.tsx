'use client'

import { useAddClub } from '@rotra/data/club/useAddClub'
import { useClubIdentityIndex } from '@rotra/data/club/useClubIdentityIndex'
import { foundingCities } from '@rotra/data/fixtures/founding-cities'
import { AddClubReview } from '@rotra/ui/add-club-review'
import { AddClubForm } from '@rotra/ui/forms/add-club-form'
import type { AddClubFormInput, AddClubFormValues } from '@rotra/ui/forms/add-club-form/schema'
import { clubPriceInputFrom } from '@rotra/ui/forms/club-price-fields/helpers'
import { Sheet } from '@rotra/ui/sheet'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export type AddClubSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Checked values → what the form fields start from when coming Back (prices as peso text). */
function formInputFrom(values: AddClubFormValues): AddClubFormInput {
  return {
    ...values,
    price: clubPriceInputFrom({
      pricing: values.price.pricing,
      monthlyMinor: values.price.monthly,
      yearlyMinor: values.price.yearly,
    }),
  }
}

/**
 * A-ADD-CLUB: the two-step Add club sheet over useAddClub. The step is local state and starts at
 * the form every time the sheet opens; Review keeps the checked values (the password only in this
 * component's state, passed to the mutation and never shown or logged) and Back returns to the form
 * with every value kept. Create club sends a sourceCommandId generated once on entering review, so a
 * second tap or a retry replays the same command and never creates a second club. On success the
 * sheet closes, a toast confirms it and the new club opens on its License tab.
 */
export function AddClubSheet({ open, onOpenChange }: AddClubSheetProps) {
  const router = useRouter()
  const identity = useClubIdentityIndex()
  const add = useAddClub()
  const [values, setValues] = useState<AddClubFormValues | null>(null)
  const [draft, setDraft] = useState<AddClubFormInput | undefined>(undefined)
  // One command ID per review: the idempotency key the mock addClub dedupes on.
  const commandId = useRef<string | null>(null)
  const { reset } = add

  // Every opening starts a fresh form; nothing typed before (the password least of all) survives.
  useEffect(() => {
    if (open) {
      setValues(null)
      setDraft(undefined)
      commandId.current = null
      reset()
    }
  }, [open, reset])

  const close = () => {
    if (add.isPending) return
    onOpenChange(false)
    setValues(null)
    setDraft(undefined)
    add.reset()
  }

  const review = (checked: AddClubFormValues) => {
    commandId.current = crypto.randomUUID()
    add.reset()
    setValues(checked)
  }

  const back = () => {
    if (!values || add.isPending) return
    setDraft(formInputFrom(values))
    setValues(null)
    add.reset()
  }

  const create = () => {
    if (!values || add.isPending) return
    const sourceCommandId = commandId.current ?? crypto.randomUUID()
    commandId.current = sourceCommandId
    add.mutate(
      { input: values, sourceCommandId },
      {
        onSuccess: ({ clubId, name }) => {
          onOpenChange(false)
          setValues(null)
          setDraft(undefined)
          toast(`${name} added. Activate a license so it can run sessions.`)
          router.push(`/clubs/${clubId}?tab=license`)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  const cityName = values
    ? (foundingCities.find((city) => city.code === values.cityCode)?.name ?? values.cityCode)
    : ''

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
      title="Add club"
      hideClose={add.isPending}
      dismissible={!add.isPending}
    >
      {values ? (
        <AddClubReview
          values={{
            name: values.name,
            foundingAddress: values.foundingAddress,
            cityCode: values.cityCode,
            username: values.username,
            passwordLength: values.password.length,
            price: values.price,
          }}
          cityName={cityName}
          onBack={back}
          onCreate={create}
          isPending={add.isPending}
          serverError={add.error?.message}
        />
      ) : (
        <AddClubForm
          defaultValues={draft}
          cities={foundingCities}
          takenNames={identity.data?.names}
          takenUsernames={identity.data?.usernames}
          onSubmit={review}
          onCancel={close}
        />
      )}
    </Sheet>
  )
}
