import 'server-only'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { ServiceError } from '../service/errors'

/** Upload the square image prepared by the Admin form. The caller removes it on a known refusal. */
export async function uploadAdminPlayerPicture(playerId: string, dataUrl: string) {
  const invalid = () => new ServiceError('invalid', { picture: 'That image could not be read.' })
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl)
  if (!match || !match[1] || !match[2] || match[2].length > 1398104) throw invalid()
  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.length < 24 || bytes.length > 1048576 || bytes.toString('base64') !== match[2])
    throw invalid()
  const png = match[1] === 'png'
  if (png) {
    if (
      !bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ||
      bytes.toString('ascii', 12, 16) !== 'IHDR' ||
      bytes.readUInt32BE(16) !== 192 ||
      bytes.readUInt32BE(20) !== 192
    )
      throw invalid()
  } else if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) throw invalid()
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new ServiceError('unavailable')
  const storage = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from('player-avatars')
  const path = `${playerId}/${randomUUID()}.${png ? 'png' : 'jpg'}`
  const { error } = await storage.upload(path, bytes, {
    contentType: png ? 'image/png' : 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new ServiceError('unavailable')
  return {
    reference: storage.getPublicUrl(path).data.publicUrl,
    remove: () => storage.remove([path]),
  }
}

/** Delete a superseded uploaded photo only when it belongs to this player's avatar folder. */
export async function removeSupersededAdminPicture(playerId: string, reference: string | null) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key || !reference) return
  const prefix = `${url.replace(/\/$/, '')}/storage/v1/object/public/player-avatars/${playerId}/`
  if (!reference.startsWith(prefix)) return
  const filename = reference.slice(prefix.length)
  if (!/^[0-9a-f-]+\.(png|jpg|gif|webp)$/i.test(filename)) return
  const storage = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from('player-avatars')
  await storage.remove([`${playerId}/${filename}`])
}
