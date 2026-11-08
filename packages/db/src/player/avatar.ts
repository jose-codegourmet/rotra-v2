import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import type { PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { requireOwnPlayer, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { readMyAccount, readMyProfile } from './profile'

const BUCKET = 'player-avatars'
const MAX_PNG_BYTES = 2 * 1024 * 1024
const CHARACTERS = new Set(['', 'a', 'b', 'c', 'd', 'e', 'f', 'g'])
export type AvatarChoice =
  | { kind: 'initials' }
  | { kind: 'character'; id: string }
  | { kind: 'photo'; png: Buffer }

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
  if (
    choice.kind === 'photo' &&
    (choice.png.length < 24 ||
      choice.png.length > MAX_PNG_BYTES ||
      !choice.png.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ||
      choice.png.toString('ascii', 12, 16) !== 'IHDR' ||
      choice.png.readUInt32BE(16) !== 512 ||
      choice.png.readUInt32BE(20) !== 512)
  )
    throw new ServiceError('invalid', { picture: 'That image could not be read.' })
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
    const path = `${context.playerId}/${randomUUID()}.png`
    const { error } = await storage.upload(path, choice.png, {
      contentType: 'image/png',
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
