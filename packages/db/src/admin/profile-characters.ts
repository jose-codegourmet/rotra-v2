import 'server-only'
import {
  PROFILE_CHARACTER_DELETE_REFUSAL,
  PROFILE_CHARACTER_HIDE_REFUSAL,
  PROFILE_CHARACTER_MAX_BYTES,
  PROFILE_CHARACTER_MIN_SHOWN,
  PROFILE_CHARACTER_MISSING,
} from '@rotra/data/profile-character/rules'
import { createClient } from '@supabase/supabase-js'
import type { AdminContext } from '../auth/account-context'
import { dataMode } from '../auth/data-mode'
import { prisma } from '../client/prisma'
import type { Prisma, ProfileCharacter } from '../generated/prisma/client'
import { requireAdmin } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toIso } from '../service/serialize'
import { recordAudit } from './audit'

type Tx = Prisma.TransactionClient

const BUCKET = 'profile-characters'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** A seeded id ('' or a–w) or an uploaded lowercase UUID; the table CHECK says the same. */
const CHARACTER_ID = /^([a-z]?|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/
const ALREADY_BACK = 'This image is already back in the library.'
const IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const
type ImageType = keyof typeof IMAGE_TYPES

/** The wire row: the `ProfileCharacter` shape of `@rotra/data`, with an ISO upload time. */
export type ProfileCharacterDto = {
  id: string
  image: string
  shown: boolean
  uploadedAt: string
  number: number
}

const dto = (row: ProfileCharacter): ProfileCharacterDto => ({
  id: row.id,
  image: row.image,
  shown: row.shown,
  uploadedAt: toIso(row.uploadedAt),
  number: row.number,
})

const missing = () => new ServiceError('conflict', { character: PROFILE_CHARACTER_MISSING })
const order = [{ uploadedAt: 'asc' }, { number: 'asc' }] as const

/** Every write takes the same lock, so the 8-shown rule and the running number never race. */
const lock = (tx: Tx) =>
  tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('profile_characters'))`

const shownCount = (tx: Tx) =>
  tx.profileCharacter.count({ where: { shown: true, deletedAt: null } })

/** A-CHARACTERS: the whole library (hidden images included, deleted ones left out), upload order. */
export async function readProfileCharacters(context: AdminContext) {
  requireAdmin(context)
  const rows = await prisma.profileCharacter.findMany({
    where: { deletedAt: null },
    orderBy: [...order],
  })
  return rows.map(dto)
}

/** Player pickers (Player, Admin edit-player): shown images only, in upload order. Public. */
export async function readShownProfileCharacters() {
  const rows = await prisma.profileCharacter.findMany({
    where: { shown: true, deletedAt: null },
    orderBy: [...order],
  })
  return rows.map(dto)
}

/** Whether a player can newly pick this id: it exists, is shown and is not deleted. */
export async function isProfileCharacterPickable(id: string) {
  if (!CHARACTER_ID.test(id)) return false
  const row = await prisma.profileCharacter.findFirst({
    where: { id, shown: true, deletedAt: null },
    select: { id: true },
  })
  return row !== null
}

/** Never trust the data: URL label alone: the bytes must be the image type it names. */
function readImage(value: unknown): { bytes: Buffer; type: ImageType } {
  const invalid = () => new ServiceError('invalid', { image: "That image couldn't be read." })
  if (typeof value !== 'string') throw invalid()
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  const [, label, base64] = match ?? []
  if (!label || !base64) throw invalid()
  const type = label as ImageType
  if (base64.length > Math.ceil(PROFILE_CHARACTER_MAX_BYTES / 3) * 4) throw invalid()
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length < 24 || bytes.length > PROFILE_CHARACTER_MAX_BYTES) throw invalid()
  if (bytes.toString('base64') !== base64) throw invalid()
  const valid =
    type === 'image/png'
      ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) &&
        bytes.toString('ascii', 12, 16) === 'IHDR' &&
        bytes.readUInt32BE(16) === bytes.readUInt32BE(20)
      : type === 'image/jpeg'
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  if (!valid) throw invalid()
  return { bytes, type }
}

function storageBucket() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new ServiceError('unavailable')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from(BUCKET)
}

/**
 * A-CHARACTERS › upload, one image per call. The browser has already checked the file (PNG, JPG or
 * WebP, up to 1 MB) and cropped it to a square; the server checks the bytes again. `id` is a UUID
 * the client chose, so a retry after a lost reply returns the saved row instead of a second image.
 * The image goes to `profile-characters/<id>.<ext>` and is saved shown, after the last image.
 */
export async function addProfileCharacter(
  context: AdminContext,
  input: { id: unknown; image: unknown },
) {
  requireAdmin(context)
  if (typeof input.id !== 'string' || !UUID.test(input.id))
    throw new ServiceError('invalid', { id: 'Expected a lowercase UUID.' })
  const id = input.id
  const { bytes, type } = readImage(input.image)
  const existing = await prisma.profileCharacter.findUnique({ where: { id } })
  if (existing) {
    if (existing.deletedAt) throw missing()
    return dto(existing)
  }
  const storage = storageBucket()
  const path = `${id}.${IMAGE_TYPES[type]}`
  // The path is this new id's own; overwriting is only ever a retry of the same upload.
  const { error } = await storage.upload(path, bytes, {
    contentType: type,
    cacheControl: '31536000',
    upsert: true,
  })
  if (error) throw new ServiceError('unavailable')
  const image = storage.getPublicUrl(path).data.publicUrl
  try {
    return await prisma.$transaction(async (tx) => {
      await lock(tx)
      const again = await tx.profileCharacter.findUnique({ where: { id } })
      if (again) return dto(again)
      const last = await tx.profileCharacter.findFirst({
        orderBy: [{ uploadedAt: 'desc' }],
        select: { uploadedAt: true },
      })
      const top = await tx.profileCharacter.aggregate({ _max: { number: true } })
      const now = Date.now()
      const uploadedAt = new Date(Math.max(now, (last?.uploadedAt.getTime() ?? 0) + 1))
      const row = await tx.profileCharacter.create({
        data: { id, image, shown: true, uploadedAt, number: (top._max.number ?? 0) + 1 },
      })
      await recordAudit(tx, context, {
        action: 'profile_character.added',
        targetType: 'profile_character',
        targetId: row.id,
        metadata: { number: row.number },
      })
      return dto(row)
    })
  } catch (error) {
    // A known refusal did not commit; unknown failures may have committed, so keep the object.
    if (error instanceof ServiceError) await storage.remove([path]).catch(() => undefined)
    throw error
  }
}

/** A row that is in the library now (not deleted), read under the lock. */
async function current(tx: Tx, id: string) {
  if (!CHARACTER_ID.test(id)) throw missing()
  const row = await tx.profileCharacter.findUnique({ where: { id } })
  if (!row || row.deletedAt) throw missing()
  return row
}

/**
 * A-CHARACTERS › click an image: hide or show it. Hiding one of only 8 shown images is a conflict
 * with PROFILE_CHARACTER_HIDE_REFUSAL. The same value as now changes nothing and logs nothing.
 */
export async function setProfileCharacterShown(
  context: AdminContext,
  input: { id: string; shown: boolean },
) {
  requireAdmin(context)
  return prisma.$transaction(async (tx) => {
    await lock(tx)
    const row = await current(tx, input.id)
    if (row.shown === input.shown) return dto(row)
    if (!input.shown && (await shownCount(tx)) <= PROFILE_CHARACTER_MIN_SHOWN)
      throw new ServiceError('conflict', { character: PROFILE_CHARACTER_HIDE_REFUSAL })
    const saved = await tx.profileCharacter.update({
      where: { id: row.id },
      data: { shown: input.shown },
    })
    await recordAudit(tx, context, {
      action: input.shown ? 'profile_character.shown' : 'profile_character.hidden',
      targetType: 'profile_character',
      targetId: saved.id,
      metadata: { number: saved.number },
    })
    return dto(saved)
  })
}

/**
 * A-CHARACTERS › x: a soft delete. Deleting a shown image when only 8 are shown is a conflict with
 * PROFILE_CHARACTER_DELETE_REFUSAL; a hidden image can always go. The row and the stored image stay,
 * so players who use it keep it, and Undo (`restoreProfileCharacter`) brings it back in place.
 */
export async function deleteProfileCharacter(context: AdminContext, id: string) {
  requireAdmin(context)
  return prisma.$transaction(async (tx) => {
    await lock(tx)
    const row = await current(tx, id)
    if (row.shown && (await shownCount(tx)) <= PROFILE_CHARACTER_MIN_SHOWN)
      throw new ServiceError('conflict', { character: PROFILE_CHARACTER_DELETE_REFUSAL })
    const saved = await tx.profileCharacter.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    })
    await recordAudit(tx, context, {
      action: 'profile_character.deleted',
      targetType: 'profile_character',
      targetId: saved.id,
      metadata: { number: saved.number },
    })
    return dto(saved)
  })
}

/**
 * Undo of a delete: clears `deleted_at`, so the image comes back with its old shown state, upload
 * time and number. A row that is already back is a conflict ("This image is already back…").
 */
export async function restoreProfileCharacter(context: AdminContext, id: string) {
  requireAdmin(context)
  return prisma.$transaction(async (tx) => {
    await lock(tx)
    const row = CHARACTER_ID.test(id)
      ? await tx.profileCharacter.findUnique({ where: { id } })
      : null
    if (!row) throw missing()
    if (!row.deletedAt) throw new ServiceError('conflict', { character: ALREADY_BACK })
    const saved = await tx.profileCharacter.update({
      where: { id: row.id },
      data: { deletedAt: null },
    })
    await recordAudit(tx, context, {
      action: 'profile_character.restored',
      targetType: 'profile_character',
      targetId: saved.id,
      metadata: { number: saved.number },
    })
    return dto(saved)
  })
}

const IMAGE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'X-Content-Type-Options': 'nosniff',
  // An SVG served from our origin must never run script.
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
} as const

function notFound() {
  return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * `GET /api/profile-characters/[id]/image` in every app that shows player pictures. Resolves any
 * library row, hidden and deleted ones included, because a player who already uses an image keeps
 * it. An uploaded image redirects to its public Storage URL; a seeded data: URL is served as bytes.
 * An id's image never changes, so the answer is cacheable for a year. Real data mode only.
 */
export async function profileCharacterImageResponse(id: string): Promise<Response> {
  try {
    if (dataMode() !== 'real' || !CHARACTER_ID.test(id)) return notFound()
    const row = await prisma.profileCharacter.findUnique({
      where: { id },
      select: { image: true },
    })
    if (!row) return notFound()
    if (row.image.startsWith('https://'))
      return new Response(null, {
        status: 307,
        headers: { Location: row.image, 'Cache-Control': IMAGE_HEADERS['Cache-Control'] },
      })
    const data = /^data:(image\/[a-z0-9.+-]+)(;base64)?,(.*)$/s.exec(row.image)
    const [, contentType, base64, payload = ''] = data ?? []
    if (!contentType) return notFound()
    const body = base64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload))
    return new Response(new Uint8Array(body), {
      status: 200,
      headers: { ...IMAGE_HEADERS, 'Content-Type': contentType },
    })
  } catch (error) {
    console.error('[profile-characters] image', error instanceof Error ? error.name : typeof error)
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
