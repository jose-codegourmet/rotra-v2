import { parsePlayerPicture } from '@rotra/data/player/picture'
import { profileCharacterUrl } from '@rotra/ui/profile-picture'

/** Avatar consumers need a URL; a stored character reference is not an image URL. */
export function pictureSrc(reference: string | null | undefined, playerId: string, name: string) {
  const picture = parsePlayerPicture(reference ?? null)
  return picture.kind === 'character'
    ? profileCharacterUrl(playerId, name, picture.id)
    : picture.kind === 'photo'
      ? picture.src
      : undefined
}
