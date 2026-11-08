'use client'
import { useClubPlayerDetails } from '@rotra/data/club-player/useClubPlayerDetails'
import { useUpdateClubPlayerDetails } from '@rotra/data/club-player/useUpdateClubPlayerDetails'
import { MockError } from '@rotra/data/mock/errors'
import { EditPlayerDetailsForm } from '@rotra/ui/edit-player-details-form'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'
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
  // Normally already loaded when the profile opened (SavedPlayers prefetches); never a blank gap.
  if (!details.data)
    return (
      <Sheet open onOpenChange={(open) => !open && onClose()} title="Edit details">
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading details"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-24" />
        </div>
      </Sheet>
    )
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
