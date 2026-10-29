'use client'

import type { AdminClubDetail } from '@rotra/data/club/types'
import { useChangeClubPrice } from '@rotra/data/club/useChangeClubPrice'
import type { ClubPriceValues } from '@rotra/schema/club-price'
import { ClubPriceForm } from '@rotra/ui/forms/club-price-form'
import type { ClubPriceFormValues } from '@rotra/ui/forms/club-price-form/schema'
import { clubPriceInputFrom } from '@rotra/ui/forms/club-price-fields/helpers'
import { Sheet } from '@rotra/ui/sheet'
import { toast } from '@rotra/ui/toaster'
import { useEffect } from 'react'

export type ClubPriceSheetProps = {
  club: AdminClubDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * rotra-admin.html doPrice: switching to Free keeps the last paid amounts, so only the mode changes.
 * True when saving would store exactly what the club already has.
 */
function isUnchanged(club: AdminClubDetail, price: ClubPriceValues) {
  if (price.pricing === 'free') return club.licensePricing === 'free'
  return (
    club.licensePricing === 'paid' &&
    price.monthly === club.licenseMonthlyMinor &&
    price.yearly === club.licenseYearlyMinor
  )
}

/**
 * A-CLUB-PRICE: the club's own Paid or Free price over useChangeClubPrice. The form starts from the
 * stored price (a free club from its last paid amounts). Unchanged values close the sheet without
 * saving; a saved price applies to later licenses only, recorded payments keep their amounts.
 */
export function ClubPriceSheet({ club, open, onOpenChange }: ClubPriceSheetProps) {
  const change = useChangeClubPrice()
  const { reset } = change

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const close = () => {
    if (change.isPending) return
    onOpenChange(false)
    change.reset()
  }

  const save = ({ price }: ClubPriceFormValues) => {
    if (change.isPending) return
    if (isUnchanged(club, price)) {
      close()
      return
    }
    change.mutate(
      { clubId: club.id, price },
      {
        onSuccess: ({ changed, priceLine }) => {
          onOpenChange(false)
          if (changed) toast(`Price saved: ${priceLine}.`)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
      title={`Price for ${club.name}`}
      hideClose={change.isPending}
      dismissible={!change.isPending}
    >
      <ClubPriceForm
        currentPriceLine={club.priceLine}
        defaultValues={{
          price: clubPriceInputFrom({
            pricing: club.licensePricing,
            monthlyMinor: club.licenseMonthlyMinor,
            yearlyMinor: club.licenseYearlyMinor,
          }),
        }}
        onSubmit={save}
        onCancel={close}
        isPending={change.isPending}
        serverError={change.error?.message}
      />
    </Sheet>
  )
}
