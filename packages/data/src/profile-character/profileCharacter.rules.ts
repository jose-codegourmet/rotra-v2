import type { ProfileCharacter } from './profileCharacter.types'

/** rotra-admin.html CHAR_PLAYER_PAGE: images per page in the player picker */
export const PROFILE_CHARACTER_PLAYER_PAGE = 8
/** rotra-admin.html CHAR_MIN_ACTIVE: the players' first page must stay full */
export const PROFILE_CHARACTER_MIN_SHOWN = 8
/** rotra-admin.html CHAR_MAX_BYTES: 1 MB per image */
export const PROFILE_CHARACTER_MAX_BYTES = 1024 * 1024
/** Accepted image types (rotra-admin.html `accept` and type check) */
export const PROFILE_CHARACTER_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
/** Value for the file input's `accept` attribute */
export const PROFILE_CHARACTER_ACCEPT = PROFILE_CHARACTER_TYPES.join(',')
/** rotra-admin.html toastUndo: how long the Undo button stays on screen after a delete */
export const PROFILE_CHARACTER_UNDO_MS = 6000

/** rotra-admin.html charName */
export const profileCharacterName = (character: Pick<ProfileCharacter, 'number'>) =>
  `Character ${character.number}`

export const shownProfileCharacterCount = (
  characters: readonly Pick<ProfileCharacter, 'shown'>[],
) => characters.filter((c) => c.shown).length

/** Hiding a shown image when only the minimum is shown (charToggle). */
export const PROFILE_CHARACTER_HIDE_REFUSAL = `Keep at least ${PROFILE_CHARACTER_MIN_SHOWN} images shown, so the players' first page is full.`
/** Deleting a shown image when only the minimum is shown (charDelete). */
export const PROFILE_CHARACTER_DELETE_REFUSAL = `Keep at least ${PROFILE_CHARACTER_MIN_SHOWN} images shown. Upload or show another one first.`
export const PROFILE_CHARACTER_MISSING = 'This image is no longer in the library. Reload the list.'

/** Why a file is rejected, or null when it can be cropped and added (addCharFiles). */
export function profileCharacterUploadRefusal(file: { name: string; type: string; size: number }) {
  if (!(PROFILE_CHARACTER_TYPES as readonly string[]).includes(file.type))
    return `${file.name} isn't a PNG, JPG or WebP image`
  if (file.size > PROFILE_CHARACTER_MAX_BYTES) return `${file.name} is over 1 MB`
  return null
}

export const profileCharacterUnreadable = (name: string) => `${name} couldn't be read`

export const profileCharactersAddedMessage = (count: number) =>
  `${count} ${count === 1 ? 'image' : 'images'} added and shown to players.`

export const profileCharactersNotAddedMessage = (reasons: readonly string[]) =>
  `Not added: ${reasons.join('; ')}.`

/** Activity log lines (rotra-admin.html `log('char', ...)`) */
export const profileCharacterSummary = {
  added: (c: Pick<ProfileCharacter, 'number'>) => `Uploaded ${profileCharacterName(c)}.`,
  shown: (c: Pick<ProfileCharacter, 'number'>) =>
    `Showed ${profileCharacterName(c)} in the player picker.`,
  hidden: (c: Pick<ProfileCharacter, 'number'>) =>
    `Hid ${profileCharacterName(c)} in the player picker.`,
  deleted: (c: Pick<ProfileCharacter, 'number'>) =>
    `Deleted ${profileCharacterName(c)}. Players who use it keep it.`,
  restored: (c: Pick<ProfileCharacter, 'number'>) => `Undid deleting ${profileCharacterName(c)}.`,
}

/** Delete toast text with its Undo button (toastUndo) */
export const profileCharacterDeletedToast = (c: Pick<ProfileCharacter, 'number'>) =>
  `${profileCharacterName(c)} deleted.`

/** Upload order, oldest first: what players and Admin see. */
export const inUploadOrder = <T extends Pick<ProfileCharacter, 'uploadedAt'>>(list: readonly T[]) =>
  [...list].sort((a, b) => a.uploadedAt - b.uploadedAt)
