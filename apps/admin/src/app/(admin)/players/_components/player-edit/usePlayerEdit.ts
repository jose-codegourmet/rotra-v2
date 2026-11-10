'use client'
import { useAdminPlayerEdit } from '@rotra/data/admin-player/useAdminPlayerEdit'
import { useAdminPlayerMutations } from '@rotra/data/admin-player/useAdminPlayerMutations'
import { useAdminClubs } from '@rotra/data/club/useAdminClubs'
import { MockError } from '@rotra/data/mock/errors'
import { cropProfileCharacterToSquare } from '@rotra/data/profile-character/crop'
import { profileCharacterImage } from '@rotra/data/profile-character/images'
import { useShownProfileCharacters } from '@rotra/data/profile-character/useShownProfileCharacters'
import type { AdminPlayerEditValues } from '@rotra/schema/admin-player'
import type { AdminEditPlayerFormProps } from '@rotra/ui/admin-edit-player-form'
import { toast } from '@rotra/ui/toaster'
import { useMemo } from 'react'

export type PlayerEditProps = Omit<AdminEditPlayerFormProps, 'formId'>

/**
 * A-PLAYER-EDIT (A07.7): wires the full Edit player form (rotra-admin.html pmSave). Saves everything
 * through one revision-checked update and toasts the data layer's exact message. Nothing changed
 * toasts "Nothing changed." and sends nothing. Offline shows as a toast and the form stays open.
 * Field errors go inline, anything else (a stale revision) is the form's notice with Reload.
 * The password lives only in the form and in the update call; it is never kept here.
 */
export function usePlayerEdit(
  playerId: string,
  {
    enabled = true,
    onDone,
    onReload,
  }: { enabled?: boolean; onDone: () => void; onReload: () => void },
) {
  const record = useAdminPlayerEdit(playerId, { enabled: enabled && !!playerId })
  const characters = useShownProfileCharacters()
  const clubs = useAdminClubs()
  const { update } = useAdminPlayerMutations()
  const error = update.error
  const fieldErrors = useMemo(
    () => (error instanceof MockError && error.fieldErrors ? error.fieldErrors : undefined),
    [error],
  )
  const offline = error instanceof MockError && error.kind === 'offline'
  const player = record.data
  const edit: PlayerEditProps | undefined = player
    ? {
        player,
        characters: characters.data ?? [],
        characterImage: profileCharacterImage,
        cropPhoto: cropProfileCharacterToSquare,
        createdBy:
          clubs.data?.clubs.find((club) => club.id === player.createdByClubId)?.name ?? 'Admin',
        isPending: update.isPending,
        // Offline is a toast, not a notice; field errors are inline.
        serverError: error && !fieldErrors && !offline ? error.message : undefined,
        fieldErrors,
        onReload,
        onNothingChanged: () => {
          toast('Nothing changed.')
          onDone()
        },
        onSubmit: async (values: AdminPlayerEditValues) => {
          update.reset()
          try {
            const result = await update.mutateAsync({
              ...values,
              id: player.id,
              revision: player.revision,
            })
            toast.success(result.message)
            onDone()
          } catch (failure) {
            if (failure instanceof MockError && failure.kind === 'offline')
              toast.error(failure.message)
          }
        },
      }
    : undefined
  return {
    edit,
    /** The edit record could not be loaded */
    isError: record.isError,
    refetch: () => void record.refetch(),
    isPending: update.isPending,
    reset: update.reset,
  }
}
