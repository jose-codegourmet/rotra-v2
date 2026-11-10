import images from '../profile-character/characters.json'
import type { ProfileCharacter } from '../profile-character/profileCharacter.types'

/** The 24 sample uploads (three player pages of 8), all shown, in upload order. */
export const profileCharacters: ProfileCharacter[] = images.map((c, index) => ({
  ...c,
  number: index + 1,
}))
