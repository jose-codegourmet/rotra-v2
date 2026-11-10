/**
 * One image in the platform owner's profile character library (rotra-admin.html `S.chars`).
 *
 * How a picture refers to a library image: a player's stored picture is the string
 * `character:<id>` (see `characterPictureReference` in player/picture.ts), never a copy of the
 * image or a position in the shown list. Hiding or deleting a library image changes only the
 * library (`shown`, or the row itself); every stored `character:<id>` stays untouched, so players
 * who already use the image keep it. `profileCharacterImage` resolves such a reference even after
 * the image was hidden or deleted. Only the picker (`useShownProfileCharacters`) and the choose
 * check of `setMyProfilePicture` look at `shown`, so nobody can newly pick a hidden image.
 */
export type ProfileCharacter = {
  id: string
  /** URL or data URL of the centred square image */
  image: string
  /** Shown to players in the picker; hidden images stay in the library, dimmed in Admin */
  shown: boolean
  /** Upload time (ms); the order players and Admin see. Strictly increasing per upload. */
  uploadedAt: number
  /** Running upload number; Admin labels the image "Character <number>" */
  number: number
}

/** Result of one Admin upload batch: accepted files are saved, rejected ones are only listed. */
export type AddProfileCharactersResult = {
  added: ProfileCharacter[]
  /** One reason per rejected file, e.g. "a.gif isn't a PNG, JPG or WebP image" */
  notAdded: string[]
  /** "N images added and shown to players." or null when nothing was added */
  addedMessage: string | null
  /** "Not added: <reason>; <reason>." or null when every file was accepted */
  notAddedMessage: string | null
}
