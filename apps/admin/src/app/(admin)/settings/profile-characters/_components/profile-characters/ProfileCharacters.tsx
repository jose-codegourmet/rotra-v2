'use client'

import {
  PROFILE_CHARACTER_UNDO_MS,
  profileCharacterDeletedToast,
  shownProfileCharacterCount,
} from '@rotra/data/profile-character/rules'
import {
  useAddProfileCharacters,
  useDeleteProfileCharacter,
  useRestoreProfileCharacter,
  useSetProfileCharacterShown,
} from '@rotra/data/profile-character/useProfileCharacterMutations'
import { useProfileCharacters } from '@rotra/data/profile-character/useProfileCharacters'
import { Card } from '@rotra/ui/card'
import { CharacterGrid } from '@rotra/ui/character-grid'
import { CHARACTER_PICKER_PAGE_SIZE } from '@rotra/ui/character-picker'
import { EmptyState } from '@rotra/ui/empty-state'
import { ErrorState } from '@rotra/ui/error-state'
import { ImageDropZone } from '@rotra/ui/image-drop-zone'
import { PageHeader } from '@rotra/ui/page-header'
import { toast } from '@rotra/ui/toaster'
import { useDenyOnPermissionError } from '../../../../_components/admin-workspace-shell/AdminWorkspaceShell'
import { ProfileCharactersSkeleton } from './ProfileCharactersSkeleton'

/**
 * A-CHARACTERS: the platform owner's profile character library as a plain grid. Click an image to
 * hide or show it, the small x deletes it with a 6-second Undo, and the drop zone takes several
 * images at once. At least 8 stay shown; a refusal and the offline error come back from the
 * mutations as messages and show as toasts, with nothing changed.
 */
export function ProfileCharacters() {
  const characters = useProfileCharacters()
  const add = useAddProfileCharacters()
  const setShown = useSetProfileCharacterShown()
  const remove = useDeleteProfileCharacter()
  const restore = useRestoreProfileCharacter()
  const denied = useDenyOnPermissionError(characters.error)

  if (denied) return null

  const list = characters.data ?? []
  const shown = shownProfileCharacterCount(list)
  const hidden = list.length - shown

  const onFiles = (files: File[]) => {
    add.mutate(files, {
      onSuccess: (result) => {
        if (result.addedMessage) toast(result.addedMessage)
        if (result.notAddedMessage) toast(result.notAddedMessage)
      },
      onError: (error) => toast.error(error.message),
    })
  }

  const onToggle = (id: string) => {
    const character = list.find((item) => item.id === id)
    if (!character) return
    setShown.mutate(
      { id, shown: !character.shown },
      { onError: (error) => toast.error(error.message) },
    )
  }

  const onDelete = (id: string) => {
    remove.mutate(id, {
      onSuccess: (deleted) =>
        toast.success(profileCharacterDeletedToast(deleted), {
          duration: PROFILE_CHARACTER_UNDO_MS,
          action: {
            label: 'Undo',
            onClick: () =>
              restore.mutate(deleted, { onError: (error) => toast.error(error.message) }),
          },
        }),
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <>
      <PageHeader
        title="Profile characters"
        description={`Players see the shown images, ${CHARACTER_PICKER_PAGE_SIZE} per page. Click an image to hide or show it. ${shown} shown${hidden ? ` · ${hidden} hidden` : ''}.`}
      />
      {characters.isError && !characters.data ? (
        <Card>
          <ErrorState
            title="Couldn't load the profile characters."
            onRetry={() => void characters.refetch()}
            retrying={characters.isFetching}
            retryLabel="Retry"
          >
            Check your connection, then try again.
          </ErrorState>
        </Card>
      ) : !characters.data ? (
        <ProfileCharactersSkeleton />
      ) : (
        <>
          <ImageDropZone id="char-file" onFiles={onFiles} />
          {list.length === 0 ? (
            <Card>
              <EmptyState title="No images yet.">
                Upload at least {CHARACTER_PICKER_PAGE_SIZE} images so the players' first page is
                full.
              </EmptyState>
            </Card>
          ) : (
            <CharacterGrid
              items={list.map((item) => ({
                id: item.id,
                src: item.image,
                shown: item.shown,
                number: item.number,
              }))}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          )}
        </>
      )}
    </>
  )
}
