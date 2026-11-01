import 'server-only'
import { randomUUID } from 'node:crypto'
import { crc32, inflateSync } from 'node:zlib'
import { createClient } from '@supabase/supabase-js'
import type { ClubContext } from '../auth/account-context'
import { requireClubEntitlement, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { readClubSettings, updateClubSettings } from './clubs'

const LOGO_BUCKET = 'club-logos'
const MAX_PNG_BYTES = 512 * 1024
const DATA_PREFIX = 'data:image/png;base64,'

/** Only the existing picker’s normalized 256 px PNG is accepted, never a URL or storage path. */
function readLogo(value: unknown): Buffer | null {
  if (value === null) return null
  const invalid = () => new ServiceError('invalid', { logoUrl: 'That image could not be read' })
  if (typeof value !== 'string' || !value.startsWith(DATA_PREFIX)) throw invalid()
  const base64 = value.slice(DATA_PREFIX.length)
  if (base64.length > Math.ceil(MAX_PNG_BYTES / 3) * 4) throw invalid()
  const png = Buffer.from(base64, 'base64')
  if (
    png.length < 57 ||
    png.length > MAX_PNG_BYTES ||
    png.toString('base64') !== base64 ||
    !png.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ||
    png.readUInt32BE(8) !== 13 ||
    png.toString('ascii', 12, 16) !== 'IHDR' ||
    png.readUInt32BE(16) !== 256 ||
    png.readUInt32BE(20) !== 256 ||
    png[24] !== 8 ||
    ![2, 6].includes(png.readUInt8(25)) ||
    png[26] !== 0 ||
    png[27] !== 0 ||
    png[28] !== 0
  )
    throw invalid()
  const compressed: Buffer[] = []
  let ended = false
  for (let offset = 8; offset < png.length; ) {
    if (offset + 12 > png.length) throw invalid()
    const length = png.readUInt32BE(offset)
    const end = offset + 12 + length
    if (end > png.length) throw invalid()
    if (crc32(png.subarray(offset + 4, end - 4)) !== png.readUInt32BE(end - 4)) throw invalid()
    const type = png.toString('ascii', offset + 4, offset + 8)
    if (type === 'IHDR' && offset !== 8) throw invalid()
    if (type === 'IDAT') compressed.push(png.subarray(offset + 8, end - 4))
    if (type === 'IEND') {
      if (length !== 0 || end !== png.length) throw invalid()
      ended = true
    }
    offset = end
  }
  if (!ended || !compressed.length) throw invalid()
  const rowSize = 1 + 256 * (png[25] === 6 ? 4 : 3)
  try {
    const pixels = inflateSync(Buffer.concat(compressed), { maxOutputLength: rowSize * 256 })
    if (pixels.length !== rowSize * 256) throw invalid()
    for (let row = 0; row < 256; row++) if (pixels.readUInt8(row * rowSize) > 4) throw invalid()
  } catch {
    throw invalid()
  }
  return png
}

/** Upload first, then atomically replace the saved reference under the club’s expected revision. */
export async function updateClubLogo(
  context: ClubContext,
  input: { logoUrl: unknown; expectedRevision: unknown },
) {
  await requireClubEntitlement(context)
  if (typeof input.expectedRevision !== 'string' || !/^\d+$/.test(input.expectedRevision))
    throw new ServiceError('invalid', { revision: 'Expected a whole-number revision.' })
  const png = readLogo(input.logoUrl)
  const club = await readClubSettings(context)
  requireRevision(BigInt(club.revision), input.expectedRevision)
  if (png === null)
    return updateClubSettings(context, { expectedRevision: input.expectedRevision, logoRef: null })

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new ServiceError('unavailable')
  const storage = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from(LOGO_BUCKET)
  const path = `${context.clubId}/${randomUUID()}.png`
  const { error } = await storage.upload(path, png, {
    contentType: 'image/png',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new ServiceError('unavailable')
  const logoRef = storage.getPublicUrl(path).data.publicUrl
  try {
    return await updateClubSettings(context, { expectedRevision: input.expectedRevision, logoRef })
  } catch (error) {
    // A known service rejection did not commit. Unknown failures may have committed: retain the
    // object in that case. Never delete previous logos, which result snapshots may still reference.
    if (error instanceof ServiceError) await storage.remove([path]).catch(() => undefined)
    throw error
  }
}
