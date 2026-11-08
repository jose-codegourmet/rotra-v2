/** Character IDs match the eight choices in the Profile picture dialog. */
export const PLAYER_CHARACTER_IDS = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g'] as const
export type PlayerCharacterId = (typeof PLAYER_CHARACTER_IDS)[number]

/** Crop in auto-oriented image coordinates, after the clockwise quarter-turn. */
export type PictureCrop = { x: number; y: number; zoom: number; rotation: number }

/** A local draft until the explicit Done command; real mode uploads through the owner-only server. */
export type PlayerPictureChoice =
  | { kind: 'initials' }
  | { kind: 'character'; id: PlayerCharacterId }
  | { kind: 'photo'; file: File; crop?: PictureCrop }

/** Interpret avatar references before giving them to an image component. */
export function parsePlayerPicture(
  reference: string | null,
):
  | { kind: 'initials' }
  | { kind: 'character'; id: PlayerCharacterId }
  | { kind: 'photo'; src: string } {
  if (!reference) return { kind: 'initials' }
  if (reference.startsWith('character:')) {
    const id = reference.slice('character:'.length)
    if (PLAYER_CHARACTER_IDS.some((candidate) => candidate === id))
      return { kind: 'character', id: id as PlayerCharacterId }
    return { kind: 'initials' }
  }
  return { kind: 'photo', src: reference }
}

export function characterPictureReference(id: PlayerCharacterId): string {
  if (!PLAYER_CHARACTER_IDS.some((candidate) => candidate === id))
    throw new Error('Choose a character.')
  return `character:${id}`
}
