import { profileCharacterImage } from '@rotra/data/profile-character/images'
import { profilePictureSrc } from '@rotra/ui/profile-picture'

/** Avatar consumers need a URL; a stored character reference is not an image URL. */
export function pictureSrc(reference: string | null | undefined, playerId: string, name: string) {
  return profileCharacterImage(reference) ?? profilePictureSrc(reference, playerId, name)
}
