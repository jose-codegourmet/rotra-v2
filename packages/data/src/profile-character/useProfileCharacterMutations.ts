'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAuditKeys } from '../admin-audit/queryKeys'
import {
  addProfileCharacters,
  deleteProfileCharacter,
  restoreProfileCharacter,
  setProfileCharacterShown,
} from './fetchers'
import type { ProfileCharacter } from './profileCharacter.types'
import { profileCharacterKeys } from './queryKeys'

/** Library, player pickers and the Record of actions all change together. */
function useSettled() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: profileCharacterKeys.all }),
      client.invalidateQueries({ queryKey: adminAuditKeys.all }),
    ])
}
const options = { networkMode: 'always', retry: false } as const

/** mutate(File[]) → AddProfileCharactersResult; show `addedMessage` and `notAddedMessage` as toasts. */
export function useAddProfileCharacters() {
  return useMutation({
    mutationFn: (files: File[]) => addProfileCharacters(files),
    onSettled: useSettled(),
    ...options,
  })
}

/** mutate({ id, shown }) → the saved ProfileCharacter. The refusal below 15 shown is a MockError('conflict'). */
export function useSetProfileCharacterShown() {
  return useMutation({
    mutationFn: (input: { id: string; shown: boolean }) => setProfileCharacterShown(input),
    onSettled: useSettled(),
    ...options,
  })
}

/** mutate(id) → the deleted ProfileCharacter, to hand to useRestoreProfileCharacter for Undo. */
export function useDeleteProfileCharacter() {
  return useMutation({
    mutationFn: (id: string) => deleteProfileCharacter(id),
    onSettled: useSettled(),
    ...options,
  })
}

/** mutate(ProfileCharacter) → the restored ProfileCharacter (Undo within PROFILE_CHARACTER_UNDO_MS). */
export function useRestoreProfileCharacter() {
  return useMutation({
    mutationFn: (character: ProfileCharacter) => restoreProfileCharacter(character),
    onSettled: useSettled(),
    ...options,
  })
}
