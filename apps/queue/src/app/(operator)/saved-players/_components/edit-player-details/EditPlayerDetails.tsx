'use client'
import { useClubPlayer } from '@rotra/data/club-player/useClubPlayer'
import { useClubPlayerDetails } from '@rotra/data/club-player/useClubPlayerDetails'
import { useRemoveClubPlayerPicture } from '@rotra/data/club-player/useRemoveClubPlayerPicture'
import { useSetClubPlayerPicture } from '@rotra/data/club-player/useSetClubPlayerPicture'
import { useUpdateClubPlayerDetails } from '@rotra/data/club-player/useUpdateClubPlayerDetails'
import { useUseClubPlayerPreviousPicture } from '@rotra/data/club-player/useUseClubPlayerPreviousPicture'
import { MockError } from '@rotra/data/mock/errors'
import { EditPlayerDetailsForm } from '@rotra/ui/edit-player-details-form'
import { PROFILE_CHARACTER_IDS, profileCharacterUrl } from '@rotra/ui/profile-picture'
import { Sheet } from '@rotra/ui/sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import { useEffect, useState } from 'react'

const FIELDS = ['fullName', 'phone', 'email'] as const

const pictureMessage = (error: unknown) =>
  error instanceof MockError
    ? (error.fieldErrors?.picture ?? error.message)
    : error instanceof Error
      ? error.message
      : 'Something went wrong. Try again.'

/** Q-SAVED-PLAYERS › Edit details: loads what the club entered, saves, returns to the profile. */
export function EditPlayerDetails({
  clubPlayerId,
  onClose,
}: {
  clubPlayerId: string
  onClose: () => void
}) {
  const details = useClubPlayerDetails(clubPlayerId)
  const player = useClubPlayer(clubPlayerId)
  const save = useUpdateClubPlayerDetails()
  const setPicture = useSetClubPlayerPicture()
  const removePicture = useRemoveClubPlayerPicture()
  const previousPicture = useUseClubPlayerPreviousPicture()
  const [pictureError, setPictureError] = useState<string>()
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
  const name = details.data.fullName.trim()
  // Characters resolve from the same seed as every other avatar (claimed id and name when unclaimed).
  const seedId = player.data?.playerId ?? player.data?.id ?? clubPlayerId
  const seedName = player.data?.pictureName ?? player.data?.fullName ?? details.data.fullName
  const characters = PROFILE_CHARACTER_IDS.map((id) => ({
    id,
    image: profileCharacterUrl(seedId, seedName, id),
  }))
  const pictureCallbacks = (message: string) => ({
    onSuccess: () => toast(`${message} · ${name}`),
    onError: (e: unknown) => setPictureError(pictureMessage(e)),
  })
  return (
    <EditPlayerDetailsForm
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      details={details.data}
      isPending={save.isPending}
      serverError={error ? { message: error.message, field } : undefined}
      picture={details.data.picture}
      characters={characters}
      pictureError={pictureError}
      picturePending={setPicture.isPending || removePicture.isPending || previousPicture.isPending}
      onPictureChange={(choice) => {
        setPictureError(undefined)
        setPicture.mutate(
          choice.kind === 'photo'
            ? { clubPlayerId, kind: 'photo', file: choice.file }
            : { clubPlayerId, kind: 'character', characterId: choice.characterId },
          pictureCallbacks('Picture updated'),
        )
      }}
      onPictureRemove={() => {
        setPictureError(undefined)
        removePicture.mutate({ clubPlayerId }, pictureCallbacks('Using initials'))
      }}
      onPicturePrevious={() => {
        setPictureError(undefined)
        previousPicture.mutate({ clubPlayerId }, pictureCallbacks('Previous picture restored'))
      }}
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
