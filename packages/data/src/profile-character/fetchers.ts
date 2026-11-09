import { requireOnline } from '../mock/bridge'
import { NotConnectedError } from '../mock/errors'
import { delay } from '../mock/latency'
import { isRealDataMode } from '../real/mode'
import images from './characters.json'
import type { ProfileCharacter } from './profileCharacter.types'
export const profileCharacters: ProfileCharacter[] = images
// Keep immutable asset references after a library item is hidden or removed.
const retainedImages = new Map(images.map((c) => [c.id, c.image]))
export async function getProfileCharacters(signal?: AbortSignal) {
  if (isRealDataMode()) throw new NotConnectedError()
  await delay(150, signal)
  requireOnline()
  for (const character of profileCharacters) retainedImages.set(character.id, character.image)
  return profileCharacters.filter((c) => c.shown).sort((a, b) => a.uploadedAt - b.uploadedAt)
}

/** Resolves retained references too; hiding a character never erases an existing picture. */
export function profileCharacterImage(reference: string | null | undefined) {
  return reference?.startsWith('character:')
    ? (profileCharacters.find((c) => c.id === reference.slice(10))?.image ??
        retainedImages.get(reference.slice(10)))
    : undefined
}
