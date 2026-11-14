import 'server-only'
import {
  DEFAULT_PROFILE_BANNER_ID,
  PROFILE_BANNER_ALREADY_BACK,
  PROFILE_BANNER_DEFAULT_HIDDEN,
  PROFILE_BANNER_DEFAULT_REFUSAL,
  PROFILE_BANNER_DELETE_REFUSAL,
  PROFILE_BANNER_HIDE_REFUSAL,
  PROFILE_BANNER_MAX_BYTES,
  PROFILE_BANNER_MIN_SHOWN,
  PROFILE_BANNER_MISSING,
  resolveProfileBanner,
} from '@rotra/data/profile-banner/rules'
import type { ResolvedProfileBanner } from '@rotra/data/profile-banner/types'
import { createClient } from '@supabase/supabase-js'
import type { AdminContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma, ProfileBanner } from '../generated/prisma/client'
import { requireAdmin } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toIso } from '../service/serialize'
import { recordAudit } from './audit'

type Tx = Prisma.TransactionClient
type Db = Tx | typeof prisma

/** Public Supabase Storage bucket for uploaded banners, created by hand like `profile-characters`. */
const BUCKET = 'profile-banners'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** A seeded key (lowercase word) or an uploaded lowercase UUID; the table CHECK says the same. */
const BANNER_ID = /^([a-z]{1,24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/
const IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const
type ImageType = keyof typeof IMAGE_TYPES

/** The wire row: the `ProfileBanner` shape of `@rotra/data`, with an ISO upload time. */
export type ProfileBannerDto = {
  id: string
  image: string
  shown: boolean
  uploadedAt: string
  number: number
  /** The Admin default banner (D-2026-11-13-03); at most one row has it */
  isDefault: boolean
}

const dto = (row: ProfileBanner): ProfileBannerDto => ({
  id: row.id,
  image: row.image,
  shown: row.shown,
  uploadedAt: toIso(row.uploadedAt),
  number: row.number,
  isDefault: row.isDefault,
})

const missing = () => new ServiceError('conflict', { banner: PROFILE_BANNER_MISSING })
const order = [{ uploadedAt: 'asc' }, { number: 'asc' }] as const

/** Every write takes the same lock, so the 2-shown rule and the running number never race. */
const lock = (tx: Tx) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('profile_banners'))`

const shownCount = (tx: Tx) => tx.profileBanner.count({ where: { shown: true, deletedAt: null } })

/** A-BANNERS: the whole library (hidden banners included, deleted ones left out), upload order. */
export async function readProfileBanners(context: AdminContext) {
  requireAdmin(context)
  const rows = await prisma.profileBanner.findMany({
    where: { deletedAt: null },
    orderBy: [...order],
  })
  return rows.map(dto)
}

/** The Player banner picker: shown banners only, in upload order. Public. */
export async function readShownProfileBanners(db: Db = prisma) {
  const rows = await db.profileBanner.findMany({
    where: { shown: true, deletedAt: null },
    orderBy: [...order],
  })
  return rows.map(dto)
}

/** Whether a player can newly pick this banner: it exists, is shown and is not deleted. */
export async function isProfileBannerPickable(id: string, db: Db = prisma) {
  if (!BANNER_ID.test(id)) return false
  const row = await db.profileBanner.findFirst({
    where: { id, shown: true, deletedAt: null },
    select: { id: true },
  })
  return row !== null
}

/**
 * The banner a profile card draws for a stored `players.banner_id`: the chosen row when it still
 * exists (hidden and deleted rows included, so players keep it); otherwise the Admin default
 * (`is_default`, D-2026-11-13-03), else Court while it is shown, else the first shown banner. `chosen` is the row the profile read
 * already joined, when it has one.
 */
export async function resolvePlayerBanner(
  chosen: { id: string; image: string } | null,
  db: Db = prisma,
): Promise<ResolvedProfileBanner> {
  if (chosen) return resolveProfileBanner(chosen.id, () => chosen, [])
  return resolveProfileBanner(null, () => undefined, await readShownProfileBanners(db))
}

/**
 * Never trust the data: URL label alone: the bytes must be the image type it names, and a PNG must
 * already be the 5:2 crop the browser makes.
 */
function readImage(value: unknown): { bytes: Buffer; type: ImageType } {
  const invalid = () => new ServiceError('invalid', { image: "That image couldn't be read." })
  if (typeof value !== 'string') throw invalid()
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  const [, label, base64] = match ?? []
  if (!label || !base64) throw invalid()
  const type = label as ImageType
  if (base64.length > Math.ceil(PROFILE_BANNER_MAX_BYTES / 3) * 4) throw invalid()
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length < 24 || bytes.length > PROFILE_BANNER_MAX_BYTES) throw invalid()
  if (bytes.toString('base64') !== base64) throw invalid()
  const valid =
    type === 'image/png'
      ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) &&
        bytes.toString('ascii', 12, 16) === 'IHDR' &&
        bytes.readUInt32BE(16) * 2 === bytes.readUInt32BE(20) * 5
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
 * A-BANNERS › upload, one banner per call. The browser has already checked the file (PNG, JPG or
 * WebP, up to 2 MB) and cropped it to a centred 5:2; the server checks the bytes again. `id` is a
 * UUID the client chose, so a retry after a lost reply returns the saved row instead of a second
 * banner. The image goes to `profile-banners/<id>.<ext>` and is saved shown, after the last banner.
 */
export async function addProfileBanner(
  context: AdminContext,
  input: { id: unknown; image: unknown },
) {
  requireAdmin(context)
  if (typeof input.id !== 'string' || !UUID.test(input.id))
    throw new ServiceError('invalid', { id: 'Expected a lowercase UUID.' })
  const id = input.id
  const { bytes, type } = readImage(input.image)
  const existing = await prisma.profileBanner.findUnique({ where: { id } })
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
      const again = await tx.profileBanner.findUnique({ where: { id } })
      if (again) return dto(again)
      const last = await tx.profileBanner.findFirst({
        orderBy: [{ uploadedAt: 'desc' }],
        select: { uploadedAt: true },
      })
      const top = await tx.profileBanner.aggregate({ _max: { number: true } })
      const uploadedAt = new Date(Math.max(Date.now(), (last?.uploadedAt.getTime() ?? 0) + 1))
      const row = await tx.profileBanner.create({
        data: { id, image, shown: true, uploadedAt, number: (top._max.number ?? 0) + 1 },
      })
      await recordAudit(tx, context, {
        action: 'profile_banner.added',
        targetType: 'profile_banner',
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
  if (!BANNER_ID.test(id)) throw missing()
  const row = await tx.profileBanner.findUnique({ where: { id } })
  if (!row || row.deletedAt) throw missing()
  return row
}

/**
 * A-BANNERS › click a banner: hide or show it. Hiding one of only 2 shown banners is a conflict with
 * PROFILE_BANNER_HIDE_REFUSAL; hiding the default is a conflict with PROFILE_BANNER_DEFAULT_REFUSAL
 * (checked first). The same value as now changes nothing and logs nothing.
 */
export async function setProfileBannerShown(
  context: AdminContext,
  input: { id: string; shown: boolean },
) {
  requireAdmin(context)
  return prisma.$transaction(async (tx) => {
    await lock(tx)
    const row = await current(tx, input.id)
    if (row.shown === input.shown) return dto(row)
    if (!input.shown && row.isDefault)
      throw new ServiceError('conflict', { banner: PROFILE_BANNER_DEFAULT_REFUSAL })
    if (!input.shown && (await shownCount(tx)) <= PROFILE_BANNER_MIN_SHOWN)
      throw new ServiceError('conflict', { banner: PROFILE_BANNER_HIDE_REFUSAL })
    const saved = await tx.profileBanner.update({
      where: { id: row.id },
      data: { shown: input.shown },
    })
    await recordAudit(tx, context, {
      action: input.shown ? 'profile_banner.shown' : 'profile_banner.hidden',
      targetType: 'profile_banner',
      targetId: saved.id,
      metadata: { number: saved.number },
    })
    return dto(saved)
  })
}

/**
 * A-BANNERS › ×: a soft delete. Deleting a shown banner when only 2 are shown is a conflict with
 * PROFILE_BANNER_DELETE_REFUSAL; a hidden banner can always go, except the default
 * (PROFILE_BANNER_DEFAULT_REFUSAL, checked first). The row and the stored image stay,
 * so players who use it keep it, and Undo (`restoreProfileBanner`) brings it back in place.
 */
export async function deleteProfileBanner(context: AdminContext, id: string) {
  requireAdmin(context)
  return prisma.$transaction(async (tx) => {
    await lock(tx)
    const row = await current(tx, id)
    if (row.isDefault)
      throw new ServiceError('conflict', { banner: PROFILE_BANNER_DEFAULT_REFUSAL })
    if (row.shown && (await shownCount(tx)) <= PROFILE_BANNER_MIN_SHOWN)
      throw new ServiceError('conflict', { banner: PROFILE_BANNER_DELETE_REFUSAL })
    const saved = await tx.profileBanner.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    })
    await recordAudit(tx, context, {
      action: 'profile_banner.deleted',
      targetType: 'profile_banner',
      targetId: saved.id,
      metadata: { number: saved.number },
    })
    return dto(saved)
  })
}

/**
 * Undo of a delete: clears `deleted_at`, so the banner comes back with its old shown state, upload
 * time and number. A row that is already back is a conflict.
 */
export async function restoreProfileBanner(context: AdminContext, id: string) {
  requireAdmin(context)
  return prisma.$transaction(async (tx) => {
    await lock(tx)
    const row = BANNER_ID.test(id) ? await tx.profileBanner.findUnique({ where: { id } }) : null
    if (!row) throw missing()
    if (!row.deletedAt) throw new ServiceError('conflict', { banner: PROFILE_BANNER_ALREADY_BACK })
    const saved = await tx.profileBanner.update({
      where: { id: row.id },
      data: { deletedAt: null },
    })
    await recordAudit(tx, context, {
      action: 'profile_banner.restored',
      targetType: 'profile_banner',
      targetId: saved.id,
      metadata: { number: saved.number },
    })
    return dto(saved)
  })
}

/**
 * A-BANNERS › Make default (D-2026-11-13-03): the banner every profile with no pick, every guest and
 * unclaimed profile, and every club card draws. The banner must be shown (else a conflict with
 * PROFILE_BANNER_DEFAULT_HIDDEN). The old default is cleared and the new one set in one transaction.
 * Returns `{ banner, previousId }` so Undo can make the previous default the default again;
 * `previousId` is Court when no row was marked. The same banner as now changes nothing.
 */
export async function setDefaultProfileBanner(context: AdminContext, id: string) {
  requireAdmin(context)
  return prisma.$transaction(async (tx) => {
    await lock(tx)
    const row = await current(tx, id)
    const previous = await tx.profileBanner.findFirst({ where: { isDefault: true } })
    const previousId = previous?.id ?? DEFAULT_PROFILE_BANNER_ID
    if (row.isDefault) return { banner: dto(row), previousId: row.id }
    if (!row.shown) throw new ServiceError('conflict', { banner: PROFILE_BANNER_DEFAULT_HIDDEN })
    await tx.profileBanner.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
    const saved = await tx.profileBanner.update({
      where: { id: row.id },
      data: { isDefault: true },
    })
    const previousNumber =
      previous?.number ??
      (
        await tx.profileBanner.findUnique({
          where: { id: DEFAULT_PROFILE_BANNER_ID },
          select: { number: true },
        })
      )?.number ??
      null
    await recordAudit(tx, context, {
      action: 'profile_banner.default_set',
      targetType: 'profile_banner',
      targetId: saved.id,
      metadata: { number: saved.number, previousId, previousNumber },
    })
    return { banner: dto(saved), previousId }
  })
}
