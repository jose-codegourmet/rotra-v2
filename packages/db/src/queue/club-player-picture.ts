import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { isProfileCharacterPickable } from '../admin/profile-characters'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { AvatarChoice } from '../player/avatar'
import { requireClubEntitlement } from '../service/authorize'
import { ServiceError } from '../service/errors'

/**
 * D-2026-11-09-12: the club sets the picture of its own guest or unclaimed player in Saved players
 * › Edit details (Upload photo, Choose a character, Remove, Use previous picture). Owner answers of
 * November 10, 2026: it is stored on the saved-player record (`club_players.avatar_ref`,
 * `avatar_previous_ref`), and it becomes the player's starting picture when they register. Only the
 * current and the previous photo are kept (D-2026-11-09-10): a photo that falls out of both is
 * deleted from storage. A registered player owns their picture, so the club cannot change it.
 */

const BUCKET = 'player-avatars'
const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const NOT_EDITABLE = 'This player registered, so they keep their own details.'

/** The Profile picture field's state, as mock mode's `clubPictureState`. */
export type ClubPictureStateDto = {
  kind: 'photo' | 'character' | 'initials'
  reference: string | null
  characterId: string | null
  previousSrc: string | null
}

export type ClubPictureChoice = Exclude<AvatarChoice, { kind: 'initials' }>

const isPhoto = (ref: string | null | undefined): ref is string => !!ref && /^https?:\/\//.test(ref)

export function clubPictureStateOf(row: {
  avatarRef: string | null
  avatarPreviousRef: string | null
}): ClubPictureStateDto {
  const ref = row.avatarRef
  const previousSrc = isPhoto(row.avatarPreviousRef) ? row.avatarPreviousRef : null
  if (ref?.startsWith('character:'))
    return { kind: 'character', reference: ref, characterId: ref.slice(10), previousSrc }
  if (isPhoto(ref)) return { kind: 'photo', reference: ref, characterId: null, previousSrc }
  return { kind: 'initials', reference: null, characterId: null, previousSrc }
}

function bucket() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new ServiceError('unavailable')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from(BUCKET)
}

/** The storage path of a club-set photo URL; null for anything else (never a player's own photo). */
function clubPhotoPath(ref: string | null | undefined) {
  if (!isPhoto(ref)) return null
  const marker = `/object/public/${BUCKET}/`
  const at = ref.indexOf(marker)
  const path = at < 0 ? null : decodeURIComponent(ref.slice(at + marker.length))
  return path?.startsWith('clubs/') ? path : null
}

/**
 * Best effort: a photo no longer current or previous is deleted; a failure leaves an orphan file.
 * A photo another record still uses is kept: a club that saved an unclaimed player from another
 * club starts with that club's picture (D-2026-11-23-01), and registering copies it to the player.
 */
async function removePhotos(refs: (string | null | undefined)[]) {
  const photos = refs.filter(isPhoto)
  if (!photos.length) return
  const [clubRows, playerRows] = await Promise.all([
    prisma.clubPlayer.findMany({
      where: {
        OR: [{ avatarRef: { in: photos } }, { avatarPreviousRef: { in: photos } }],
      },
      select: { avatarRef: true, avatarPreviousRef: true },
    }),
    prisma.player.findMany({
      where: {
        OR: [{ avatarRef: { in: photos } }, { avatarPreviousRef: { in: photos } }],
      },
      select: { avatarRef: true, avatarPreviousRef: true },
    }),
  ])
  const inUse = new Set(
    [...clubRows, ...playerRows].flatMap((row) => [row.avatarRef, row.avatarPreviousRef]),
  )
  const paths = photos
    .filter((ref) => !inUse.has(ref))
    .map(clubPhotoPath)
    .filter((path): path is string => !!path)
  if (paths.length)
    await bucket()
      .remove(paths)
      .catch(() => undefined)
}

async function loadRow(context: ClubContext, clubPlayerId: string) {
  await requireClubEntitlement(context)
  const row = await prisma.clubPlayer.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: clubPlayerId } },
    select: {
      id: true,
      displayName: true,
      removedAt: true,
      linkedToClubPlayerId: true,
      avatarRef: true,
      avatarPreviousRef: true,
      revision: true,
      player: { select: { profileState: true } },
    },
  })
  if (!row || row.removedAt || row.linkedToClubPlayerId) throw new ServiceError('not_found')
  if (row.player?.profileState === 'claimed')
    throw new ServiceError('forbidden', { picture: NOT_EDITABLE })
  return row
}

/** Writes the new pair under the loaded revision, then deletes the photo that dropped out. */
async function save(
  context: ClubContext,
  row: Awaited<ReturnType<typeof loadRow>>,
  next: { avatarRef: string | null; avatarPreviousRef: string | null },
  message: string,
  uploaded?: string,
) {
  try {
    const result = await prisma.clubPlayer.updateMany({
      where: { clubId: context.clubId, id: row.id, revision: row.revision },
      data: { ...next, revision: { increment: 1 } },
    })
    if (!result.count) throw new ServiceError('conflict', { picture: 'Reload and try again.' })
  } catch (error) {
    if (uploaded) await removePhotos([uploaded])
    throw error
  }
  const kept = new Set([next.avatarRef, next.avatarPreviousRef])
  await removePhotos([row.avatarRef, row.avatarPreviousRef].filter((ref) => !kept.has(ref)))
  return {
    clubPlayerId: row.id,
    message: `${message} · ${row.displayName}`,
    picture: clubPictureStateOf(next),
  }
}

/** The photo being replaced becomes the previous one; a character or initials holds no file. */
const previousAfter = (row: { avatarRef: string | null; avatarPreviousRef: string | null }) =>
  isPhoto(row.avatarRef) ? row.avatarRef : row.avatarPreviousRef

/** Edit details › Profile picture › Upload photo or Choose a character, applied at once. */
export async function setClubPlayerPicture(
  context: ClubContext,
  clubPlayerId: string,
  choice: ClubPictureChoice,
) {
  const row = await loadRow(context, clubPlayerId)
  if (choice.kind === 'character') {
    if (!(await isProfileCharacterPickable(choice.id)))
      throw new ServiceError('invalid', { picture: 'Choose a character.' })
    return save(
      context,
      row,
      { avatarRef: `character:${choice.id}`, avatarPreviousRef: previousAfter(row) },
      'Picture updated',
    )
  }
  if (!choice.bytes.length || choice.bytes.length > MAX_PHOTO_BYTES)
    throw new ServiceError('invalid', { picture: 'Choose an image under 4 MB' })
  const storage = bucket()
  const path = `clubs/${context.clubId}/${row.id}/${randomUUID()}.${choice.extension}`
  const { error } = await storage.upload(path, choice.bytes, {
    contentType: choice.contentType,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new ServiceError('unavailable')
  const url = storage.getPublicUrl(path).data.publicUrl
  return save(
    context,
    row,
    { avatarRef: url, avatarPreviousRef: previousAfter(row) },
    'Picture updated',
    url,
  )
}

/** Edit details › Profile picture › Remove: back to initials; a removed photo is kept as previous. */
export async function removeClubPlayerPicture(context: ClubContext, clubPlayerId: string) {
  const row = await loadRow(context, clubPlayerId)
  return save(
    context,
    row,
    { avatarRef: null, avatarPreviousRef: previousAfter(row) },
    'Using initials',
  )
}

/** Edit details › Profile picture › Use previous picture: swaps the current and previous photo. */
export async function restorePreviousClubPlayerPicture(context: ClubContext, clubPlayerId: string) {
  const row = await loadRow(context, clubPlayerId)
  if (!isPhoto(row.avatarPreviousRef))
    throw new ServiceError('conflict', { picture: 'No previous picture to restore.' })
  return save(
    context,
    row,
    {
      avatarRef: row.avatarPreviousRef,
      avatarPreviousRef: isPhoto(row.avatarRef) ? row.avatarRef : null,
    },
    'Previous picture restored',
  )
}
