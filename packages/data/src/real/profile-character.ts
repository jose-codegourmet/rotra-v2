import { profileCharacterPathSegment } from '../profile-character/profileCharacter.rules'
import type { ProfileCharacter } from '../profile-character/profileCharacter.types'
import { msOf, realRequest } from './client'

/** `@rotra/db/admin/profile-characters` ProfileCharacterDto. */
type WireCharacter = {
  id: string
  image: string
  shown: boolean
  uploadedAt: string
  number: number
}

const characterOf = (wire: WireCharacter): ProfileCharacter => ({
  id: wire.id,
  image: wire.image,
  shown: wire.shown,
  uploadedAt: msOf(wire.uploadedAt),
  number: wire.number,
})

const path = (id: string) => `/api/profile-characters/${profileCharacterPathSegment(id)}`

/** Player pickers: the public list of shown images, in upload order (Player and Admin apps). */
export async function realGetShownProfileCharacters(signal?: AbortSignal) {
  const { characters } = await realRequest<{ characters: WireCharacter[] }>(
    '/api/profile-characters/shown',
    { signal },
  )
  return characters.map(characterOf)
}

/** A-CHARACTERS: the whole library, hidden images included (Admin only). */
export async function realListProfileCharacters(signal?: AbortSignal) {
  const { characters } = await realRequest<{ characters: WireCharacter[] }>(
    '/api/profile-characters',
    { signal },
  )
  return characters.map(characterOf)
}

/**
 * Saves one cropped image (a data URL). The client picks the id, so the server answers a retry of
 * the same id with the saved row; a lost reply is still a 'timeout' to check before adding again.
 */
export async function realAddProfileCharacter(image: string) {
  const { character } = await realRequest<{ character: WireCharacter }>('/api/profile-characters', {
    method: 'POST',
    body: { id: crypto.randomUUID(), image },
  })
  return characterOf(character)
}

export async function realSetProfileCharacterShown(input: { id: string; shown: boolean }) {
  const { character } = await realRequest<{ character: WireCharacter }>(path(input.id), {
    method: 'PATCH',
    body: { shown: input.shown },
  })
  return characterOf(character)
}

export async function realDeleteProfileCharacter(id: string) {
  const { character } = await realRequest<{ character: WireCharacter }>(path(id), {
    method: 'DELETE',
  })
  return characterOf(character)
}

export async function realRestoreProfileCharacter(id: string) {
  const { character } = await realRequest<{ character: WireCharacter }>(`${path(id)}/restore`, {
    method: 'POST',
  })
  return characterOf(character)
}
