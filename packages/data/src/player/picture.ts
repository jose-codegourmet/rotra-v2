/** Legacy defaults for callers without the Admin-managed character library. */
export const PLAYER_CHARACTER_IDS = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g'] as const
export type PlayerCharacterId = string

/** Crop in auto-oriented image coordinates, after the clockwise quarter-turn. */
export type PictureCrop = { x: number; y: number; zoom: number; rotation: number }

/** A local draft until the explicit Done command; real mode uploads through the owner-only server. */
export type PlayerPictureChoice = (
  | { kind: 'initials' }
  | { kind: 'character'; id: PlayerCharacterId }
  | { kind: 'photo'; file: File; crop?: PictureCrop }
  | { kind: 'photo'; src: string }
  | { kind: 'previous' }
) & { previousPhoto?: string | null }

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
    return { kind: 'character', id }
  }
  return { kind: 'photo', src: reference }
}

export function characterPictureReference(id: PlayerCharacterId): string {
  return `character:${id}`
}
