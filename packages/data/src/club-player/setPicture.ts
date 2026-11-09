import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { MockError, NotConnectedError } from '../mock/errors'
import type { MockState } from '../mock/store'
import { queueMutation } from '../mock/transaction'
import { mockPhotoReference } from '../player/photo'
import { characterPictureReference } from '../player/picture'
import { isRealDataMode } from '../real/mode'
import type { ClubPlayerPicture, SetClubPlayerPictureInput } from './clubPlayer.types'
import { clubPictureState, takesClubPicture } from './clubPlayerPicture.rules'

/** Upload photo accepts any image up to 4 MB (the mockup's limit). */
export const CLUB_PICTURE_MAX_BYTES = 4 * 1024 * 1024

const NOT_EDITABLE = 'This player registered, so they keep their own details.'

// OPEN (D-2026-11-09-12, Q19.5 #623 A and B): where a guest's picture is stored, and whether a
// club-set picture carries over when the player claims the profile, are undecided. This mock keeps
// it on the saved-player record (`ClubPlayer.picture`) and drops nothing; real mode refuses until
// the owner answers.

function pictureRow(s: MockState, id: string) {
  const row = s.clubPlayers.find(
    (p) => p.id === id && p.clubId === DEMO_CLUB_ID && !p.removedAt && !p.linkedToClubPlayerId,
  )
  if (!row) throw new MockError('permission', 'Player not available.')
  if (!takesClubPicture(row)) throw new MockError('permission', NOT_EDITABLE)
  const profilePicture = row.playerId
    ? (s.playerProfiles.find((p) => p.playerId === row.playerId)?.picture ?? null)
    : null
  return { row, current: clubPictureState(row, profilePicture) }
}

/**
 * The one previous photo kept (D-2026-11-09-10): a photo being replaced (by a photo, a character or
 * initials) becomes the previous one; characters and initials hold no file, so they never do.
 */
function nextPrevious(current: ReturnType<typeof clubPictureState>) {
  return current.kind === 'photo' && current.reference ? current.reference : current.previousSrc
}

function withPrevious(picture: ClubPlayerPicture, previous: string | null): ClubPlayerPicture {
  return previous ? { ...picture, previousSrc: previous } : picture
}

/** Reads the chosen image as a centre-cropped data URL; validation copy is the mockup's. */
async function readPhoto(file: File) {
  if (!file.type.startsWith('image/'))
    throw new MockError('permission', 'Choose an image file', { picture: 'Choose an image file' })
  if (file.size > CLUB_PICTURE_MAX_BYTES)
    throw new MockError('permission', 'Choose an image under 4 MB', {
      picture: 'Choose an image under 4 MB',
    })
  try {
    return await mockPhotoReference(file, { x: 0.5, y: 0.5, zoom: 1, rotation: 0 })
  } catch {
    throw new MockError('permission', 'That image could not be read', {
      picture: 'That image could not be read',
    })
  }
}

const changePicture = <T>(change: (s: MockState) => { data: T; text: string }) =>
  queueMutation({ area: 'Roster', clubAccess: true }, change)

/**
 * Edit details › Profile picture › Upload photo or Choose a character, applied at once (like the
 * club logo). Guests, pending guests and unclaimed profiles only; registered players refuse.
 */
export async function setClubPlayerPicture(input: SetClubPlayerPictureInput) {
  if (isRealDataMode()) throw new NotConnectedError()
  const src = input.kind === 'photo' ? await readPhoto(input.file) : null
  if (input.kind === 'character') characterPictureReference(input.characterId)
  return changePicture((s) => {
    const { row, current } = pictureRow(s, input.clubPlayerId)
    const next: ClubPlayerPicture =
      input.kind === 'photo'
        ? { kind: 'photo', src: src ?? '' }
        : { kind: 'character', characterId: input.characterId }
    row.picture = withPrevious(next, nextPrevious(current))
    return { data: { clubPlayerId: row.id }, text: `Picture updated · ${row.fullName}` }
  })
}

/** Edit details › Profile picture › Remove: back to initials; a removed photo is kept as previous. */
export function removeClubPlayerPicture(input: { clubPlayerId: string }) {
  if (isRealDataMode()) throw new NotConnectedError()
  return changePicture((s) => {
    const { row, current } = pictureRow(s, input.clubPlayerId)
    row.picture = withPrevious({ kind: 'initials' }, nextPrevious(current))
    return { data: { clubPlayerId: row.id }, text: `Using initials · ${row.fullName}` }
  })
}

/**
 * Edit details › Profile picture › Use previous picture: swaps the current and previous photo. A
 * current character or initials holds no file, so after the swap no previous photo remains.
 */
export function restorePreviousClubPlayerPicture(input: { clubPlayerId: string }) {
  if (isRealDataMode()) throw new NotConnectedError()
  return changePicture((s) => {
    const { row, current } = pictureRow(s, input.clubPlayerId)
    if (!current.previousSrc) throw new MockError('conflict', 'No previous picture to restore.')
    row.picture = withPrevious(
      { kind: 'photo', src: current.previousSrc },
      current.kind === 'photo' ? current.reference : null,
    )
    return { data: { clubPlayerId: row.id }, text: `Previous picture restored · ${row.fullName}` }
  })
}
