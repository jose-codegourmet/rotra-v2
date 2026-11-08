import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import type { PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { requireOwnPlayer, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { readMyAccount, readMyProfile } from './profile'

const BUCKET = 'player-avatars'
const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const CHARACTERS = new Set(['', 'a', 'b', 'c', 'd', 'e', 'f', 'g'])
export type AvatarChoice =
  | { kind: 'initials' }
  | { kind: 'character'; id: string }
  | {
      kind: 'photo'
      bytes: Buffer
      contentType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'
      extension: 'png' | 'jpg' | 'gif' | 'webp'
    }

/** Only the owning player can save a server-normalized picture under the loaded revision. */
export async function updatePlayerAvatar(
  context: PlayerContext,
  expectedRevision: string,
  choice: AvatarChoice,
) {
  requireOwnPlayer(context, context.playerId)
  if (!/^\d{1,19}$/.test(expectedRevision) || BigInt(expectedRevision) >= 9223372036854775807n)
    throw new ServiceError('invalid', { revision: 'Reload and try again.' })
  if (choice.kind === 'character' && !CHARACTERS.has(choice.id))
    throw new ServiceError('invalid', { picture: 'Choose a character.' })
  if (choice.kind === 'photo' && !validPhoto(choice))
    throw new ServiceError('invalid', { picture: 'That image could not be read or exceeds 2 MiB.' })
  requireRevision(BigInt((await readMyAccount(context)).revision), expectedRevision)
  let reference: string | null = choice.kind === 'character' ? `character:${choice.id}` : null
  let uploaded: { remove: () => Promise<unknown> } | undefined
  if (choice.kind === 'photo') {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY
    if (!url || !key) throw new ServiceError('unavailable')
    const storage = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).storage.from(BUCKET)
    const path = `${context.playerId}/${randomUUID()}.${choice.extension}`
    const { error } = await storage.upload(path, choice.bytes, {
      contentType: choice.contentType,
      cacheControl: '31536000',
      upsert: false,
    })
    if (error) throw new ServiceError('unavailable')
    reference = storage.getPublicUrl(path).data.publicUrl
    uploaded = { remove: () => storage.remove([path]) }
  }
  try {
    const result = await prisma.player.updateMany({
      where: { id: context.playerId, revision: BigInt(expectedRevision) },
      data: { avatarRef: reference, revision: { increment: 1 } },
    })
    if (!result.count) throw new ServiceError('conflict')
  } catch (error) {
    // A known refusal did not commit; unknown failures may have committed.
    if (uploaded && error instanceof ServiceError) await uploaded.remove().catch(() => undefined)
    throw error
  }
  return {
    profile: await readMyProfile(context),
    revision: (BigInt(expectedRevision) + 1n).toString(),
  }
}

/** Defense at the service boundary: never trust a MIME label or extension alone. */
function validPhoto(photo: Extract<AvatarChoice, { kind: 'photo' }>): boolean {
  const b = photo.bytes
  if (b.length < 24 || b.length > MAX_PHOTO_BYTES) return false
  if (photo.contentType === 'image/png' && photo.extension === 'png')
    return (
      b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) &&
      b.toString('ascii', 12, 16) === 'IHDR' &&
      b.readUInt32BE(16) <= 512 &&
      b.readUInt32BE(16) === b.readUInt32BE(20)
    )
  if (photo.contentType === 'image/jpeg' && photo.extension === 'jpg')
    return b[0] === 255 && b[1] === 216 && b[2] === 255
  if (photo.contentType === 'image/gif' && photo.extension === 'gif')
    return /^GIF8[79]a$/.test(b.toString('ascii', 0, 6))
  return (
    photo.contentType === 'image/webp' &&
    photo.extension === 'webp' &&
    b.toString('ascii', 0, 4) === 'RIFF' &&
    b.toString('ascii', 8, 12) === 'WEBP'
  )
}
