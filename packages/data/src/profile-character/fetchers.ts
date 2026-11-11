import { requireAdminOnline } from '../admin-account/fetchers'
import { adminMutation } from '../admin-account/mutation'
import { appendAdminAudit } from '../admin-audit/fetchers'
import { profileCharacters as seed } from '../fixtures/profileCharacters'
import { checkMockSave, requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { RealRequestError } from '../real/client'
import { isRealDataMode } from '../real/mode'
import {
  realAddProfileCharacter,
  realDeleteProfileCharacter,
  realGetShownProfileCharacters,
  realListProfileCharacters,
  realRestoreProfileCharacter,
  realSetProfileCharacterShown,
} from '../real/profile-character'
import { cropProfileCharacterToSquare } from './crop'
import {
  inUploadOrder,
  PROFILE_CHARACTER_DELETE_REFUSAL,
  PROFILE_CHARACTER_HIDE_REFUSAL,
  PROFILE_CHARACTER_MIN_SHOWN,
  PROFILE_CHARACTER_MISSING,
  profileCharacterImagePath,
  profileCharacterSummary,
  profileCharactersAddedMessage,
  profileCharactersNotAddedMessage,
  profileCharacterUnreadable,
  profileCharacterUploadRefusal,
  shownProfileCharacterCount,
} from './profileCharacter.rules'
import type { AddProfileCharactersResult, ProfileCharacter } from './profileCharacter.types'

// Keeps the image of every library item that was hidden, deleted or uploaded, so a stored
// `character:<id>` reference still resolves (see ProfileCharacter). Real mode fills it from every
// list it loads; the seeded ids are the database's seed rows, with the same images.
const retainedImages = new Map(seed.map((c) => [c.id, c.image]))

/** Real mode: a library id, '' or a–z (seeded) or a UUID (uploaded). Anything else has no image. */
const LIBRARY_ID = /^([a-z]?|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/

function retain(characters: readonly ProfileCharacter[]) {
  for (const character of characters) retainedImages.set(character.id, character.image)
  return characters
}

/** Player pickers: shown images only, in upload order. */
export async function getProfileCharacters(signal?: AbortSignal) {
  if (isRealDataMode()) return inUploadOrder(retain(await realGetShownProfileCharacters(signal)))
  await delay(150, signal)
  requireOnline()
  const characters = readMockState().profileCharacters
  for (const character of characters) retainedImages.set(character.id, character.image)
  return inUploadOrder(characters.filter((c) => c.shown))
}

/** A-CHARACTERS: the whole library, hidden images included, in upload order. */
export async function listProfileCharacters(signal?: AbortSignal): Promise<ProfileCharacter[]> {
  if (isRealDataMode()) return inUploadOrder(retain(await realListProfileCharacters(signal)))
  await delay(150, signal)
  return inUploadOrder(readMockState().profileCharacters)
}

/**
 * Resolves retained references too; hiding a character never erases an existing picture. Real mode:
 * an id no loaded list named (an upload, on a screen that never fetched the library) resolves to
 * the app's `/api/profile-characters/<id>/image`, which serves hidden and deleted images too.
 */
export function profileCharacterImage(reference: string | null | undefined) {
  if (!reference?.startsWith('character:')) return undefined
  const id = reference.slice(10)
  if (isRealDataMode())
    return (
      retainedImages.get(id) ?? (LIBRARY_ID.test(id) ? profileCharacterImagePath(id) : undefined)
    )
  return (
    mockStore.getSnapshot().profileCharacters.find((c) => c.id === id)?.image ??
    retainedImages.get(id)
  )
}

/** Whether a player can newly pick this id: it is in the library and shown. */
export function isProfileCharacterShown(id: string) {
  return readMockState().profileCharacters.some((c) => c.id === id && c.shown)
}

function find(draft: { profileCharacters: ProfileCharacter[] }, id: string) {
  const character = draft.profileCharacters.find((c) => c.id === id)
  if (!character) throw new MockError('conflict', PROFILE_CHARACTER_MISSING)
  return character
}

/**
 * A-CHARACTERS › upload (several files at once). Each file is checked (PNG, JPG or WebP, up to
 * 1 MB), cropped to a centred square in the browser and saved shown, after the last image. Rejected
 * files are listed in `notAdded`/`notAddedMessage`; they never fail the batch. Offline →
 * MockError('offline', ADMIN_OFFLINE_ERROR), nothing saved. Real mode saves one image per request,
 * in order; an image the server can't read is listed as unreadable, and any other failure stops the
 * batch with that error (the images saved before it stay, and the list reloads).
 */
export async function addProfileCharacters(files: File[]): Promise<AddProfileCharactersResult> {
  requireAdminOnline()
  const notAdded: string[] = []
  const accepted: { name: string; image: string }[] = []
  for (const file of files) {
    const refusal = profileCharacterUploadRefusal(file)
    if (refusal) {
      notAdded.push(refusal)
      continue
    }
    try {
      accepted.push({ name: file.name, image: await cropProfileCharacterToSquare(file) })
    } catch {
      notAdded.push(profileCharacterUnreadable(file.name))
    }
  }
  if (isRealDataMode()) {
    const added: ProfileCharacter[] = []
    for (const { name, image } of accepted) {
      try {
        added.push(await realAddProfileCharacter(image))
      } catch (error) {
        if (!(error instanceof RealRequestError) || error.status !== 422) throw error
        notAdded.push(profileCharacterUnreadable(name))
      }
    }
    retain(added)
    return addResult(added, notAdded)
  }
  const added = accepted.length
    ? await adminMutation(600, (draft) => {
        checkMockSave()
        let number = Math.max(0, ...draft.profileCharacters.map((c) => c.number))
        let at = Math.max(Date.now(), ...draft.profileCharacters.map((c) => c.uploadedAt + 1))
        return accepted.map(({ image }) => {
          const character: ProfileCharacter = {
            id: crypto.randomUUID(),
            image,
            shown: true,
            uploadedAt: at++,
            number: ++number,
          }
          draft.profileCharacters.push(character)
          retainedImages.set(character.id, image)
          appendAdminAudit(draft, {
            action: 'profile_character_added',
            targetType: 'profile_character',
            targetId: character.id,
            summary: profileCharacterSummary.added(character),
          })
          return character
        })
      })
    : []
  return addResult(added, notAdded)
}

function addResult(added: ProfileCharacter[], notAdded: string[]): AddProfileCharactersResult {
  return {
    added,
    notAdded,
    addedMessage: added.length ? profileCharactersAddedMessage(added.length) : null,
    notAddedMessage: notAdded.length ? profileCharactersNotAddedMessage(notAdded) : null,
  }
}

/**
 * A-CHARACTERS › click an image: hide or show it. Hiding one of only 15 shown images rejects with
 * MockError('conflict', PROFILE_CHARACTER_HIDE_REFUSAL). The same value as now changes nothing.
 */
export function setProfileCharacterShown(input: { id: string; shown: boolean }) {
  if (isRealDataMode()) {
    requireAdminOnline()
    return realSetProfileCharacterShown(input)
  }
  return adminMutation(300, (draft) => {
    checkMockSave()
    const character = find(draft, input.id)
    if (character.shown === input.shown) return structuredClone(character)
    if (
      !input.shown &&
      shownProfileCharacterCount(draft.profileCharacters) <= PROFILE_CHARACTER_MIN_SHOWN
    )
      throw new MockError('conflict', PROFILE_CHARACTER_HIDE_REFUSAL)
    character.shown = input.shown
    appendAdminAudit(draft, {
      action: input.shown ? 'profile_character_shown' : 'profile_character_hidden',
      targetType: 'profile_character',
      targetId: character.id,
      summary: input.shown
        ? profileCharacterSummary.shown(character)
        : profileCharacterSummary.hidden(character),
    })
    return structuredClone(character)
  })
}

/**
 * A-CHARACTERS › x: delete an image. Deleting a shown image when only 15 are shown rejects with
 * MockError('conflict', PROFILE_CHARACTER_DELETE_REFUSAL); a hidden image can always go. Resolves
 * with the deleted image, which the Undo button passes to restoreProfileCharacter. Players who use
 * it keep it (see ProfileCharacter).
 */
export function deleteProfileCharacter(id: string) {
  if (isRealDataMode()) {
    requireAdminOnline()
    return realDeleteProfileCharacter(id).then((deleted) => {
      retain([deleted])
      return deleted
    })
  }
  return adminMutation(300, (draft) => {
    checkMockSave()
    const character = find(draft, id)
    if (
      character.shown &&
      shownProfileCharacterCount(draft.profileCharacters) <= PROFILE_CHARACTER_MIN_SHOWN
    )
      throw new MockError('conflict', PROFILE_CHARACTER_DELETE_REFUSAL)
    retainedImages.set(character.id, character.image)
    draft.profileCharacters = draft.profileCharacters.filter((c) => c.id !== id)
    appendAdminAudit(draft, {
      action: 'profile_character_deleted',
      targetType: 'profile_character',
      targetId: id,
      summary: profileCharacterSummary.deleted(character),
    })
    return structuredClone(character)
  })
}

/**
 * Undo of a delete: puts the image back with its old state and upload time, so it returns to the
 * same place in the order. Rejects with MockError('conflict') when it is already back. The screen
 * offers Undo for PROFILE_CHARACTER_UNDO_MS after the delete.
 */
export function restoreProfileCharacter(character: ProfileCharacter) {
  if (isRealDataMode()) {
    requireAdminOnline()
    return realRestoreProfileCharacter(character.id)
  }
  return adminMutation(300, (draft) => {
    checkMockSave()
    if (draft.profileCharacters.some((c) => c.id === character.id))
      throw new MockError('conflict', 'This image is already back in the library.')
    draft.profileCharacters.push(structuredClone(character))
    draft.profileCharacters = inUploadOrder(draft.profileCharacters)
    appendAdminAudit(draft, {
      action: 'profile_character_restored',
      targetType: 'profile_character',
      targetId: character.id,
      summary: profileCharacterSummary.restored(character),
    })
    return structuredClone(character)
  })
}
