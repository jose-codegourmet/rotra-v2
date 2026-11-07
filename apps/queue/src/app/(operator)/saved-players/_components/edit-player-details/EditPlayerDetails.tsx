'use client'
import { useClubPlayerDetails } from '@rotra/data/club-player/useClubPlayerDetails'
import { useUpdateClubPlayerDetails } from '@rotra/data/club-player/useUpdateClubPlayerDetails'
import { MockError } from '@rotra/data/mock/errors'
import { EditPlayerDetailsForm } from '@rotra/ui/edit-player-details-form'
import { toast } from '@rotra/ui/toaster'
import { useEffect } from 'react'

const FIELDS = ['fullName', 'phone', 'email'] as const

/** Q-SAVED-PLAYERS › Edit details: loads what the club entered, saves, returns to the profile. */
export function EditPlayerDetails({
  clubPlayerId,
  onClose,
}: {
  clubPlayerId: string
  onClose: () => void
}) {
  const details = useClubPlayerDetails(clubPlayerId)
  const save = useUpdateClubPlayerDetails()
  const loadError = details.error
  useEffect(() => {
    if (!loadError) return
    toast.error(loadError.message)
    onClose()
  }, [loadError, onClose])
  if (!details.data) return null
  const error = save.error
  const field =
    error instanceof MockError ? FIELDS.find((key) => error.fieldErrors?.[key]) : undefined
  return (
    <EditPlayerDetailsForm
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      details={details.data}
      isPending={save.isPending}
      serverError={error ? { message: error.message, field } : undefined}
      onSubmit={(values) =>
        save.mutate(
          { id: clubPlayerId, values },
          {
            onSuccess: () => {
              toast(`Details saved · ${values.fullName.trim()}`)
              onClose()
            },
          },
        )
      }
    />
  )
}
