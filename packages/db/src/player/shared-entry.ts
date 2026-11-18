import 'server-only'
import type { Prisma } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { formatRtrId, nextPlayerSequence, rtrSyncDate } from './rtr-id'

type Tx = Prisma.TransactionClient

/**
 * The shared entry of an unclaimed player (D-2026-11-16-04, P15.8 #927): one per normalized email,
 * holding the RTR ID allocation and nothing a club typed. Owner answers of November 18, 2026: a new
 * thin table (`shared_player_entries`), no alias for an old RTR ID, registration matches the ROTRA
 * email or the Google email, and the phone linking of D-2026-11-11-03 stays beside it.
 */

const EMAIL = /^[^@\s]+@[^@\s]+$/
/** Same text as `ADMIN_PLAYER_RTR_ID_TAKEN` in `@rotra/schema/admin-player`. */
const ADMIN_PLAYER_RTR_ID_TAKEN =
  'Another player already has this RTR ID. Choose another place or date.'
export const RTR_ID = /^RTR-[A-Z]{2}-[A-Z]{3}-[0-9]{6}-[0-9]{4,}$/

/** Trimmed and lowercased, as `shared_player_entries.email` and `player_accounts.google_email`. */
export function normalizeEmail(typed: string | null | undefined) {
  const email = typed?.trim().toLowerCase() ?? ''
  return email && EMAIL.test(email) ? email : null
}

/** An RTR ID as typed, uppercased; null when it is not one. */
export function normalizeRtrId(typed: string | null | undefined) {
  const id = typed?.trim().toUpperCase() ?? ''
  return RTR_ID.test(id) ? id : null
}

/** Serializes everything that reads-then-writes one email (entry creation, claims, Admin edits). */
export async function lockEmail(tx: Tx, email: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`email:${email}`}))`
}

/**
 * The registered (claimed) player whose ROTRA email or connected Google email is `email`, or null.
 * The ROTRA email wins when the two belong to different accounts.
 */
export async function registeredPlayerByEmail(tx: Tx, email: string) {
  const contact = await tx.playerPrivateContact.findUnique({
    where: { email },
    select: { playerId: true, player: { select: { profileState: true } } },
  })
  if (contact?.player.profileState === 'claimed') return contact.playerId
  const google = await tx.playerAccount.findUnique({
    where: { googleEmail: email },
    select: { playerId: true, player: { select: { profileState: true } } },
  })
  return google?.player.profileState === 'claimed' ? google.playerId : null
}

/** The open (not claimed, not retired) shared entry for this email. */
export function openEntryByEmail(tx: Tx, email: string) {
  return tx.sharedPlayerEntry.findFirst({
    where: { email, claimedPlayerId: null, retiredAt: null },
  })
}

/** The open shared entry with this RTR ID (an exact, normalized RTR ID). */
export function openEntryByRtrId(tx: Tx, rtrId: string) {
  return tx.sharedPlayerEntry.findFirst({
    where: { rtrId, claimedPlayerId: null, retiredAt: null },
  })
}

/**
 * Creates the shared entry for a new email and allocates its RTR ID: one atomic counter step for
 * the creating club's founding location and today's sync day, the same counter registered players
 * use, so the two never share a sequence. The caller holds the email lock.
 */
async function createSharedEntry(tx: Tx, clubId: string, email: string, at: Date) {
  const club = await tx.club.findUniqueOrThrow({
    where: { id: clubId },
    select: { foundingLocation: true },
  })
  const location = club.foundingLocation
  const syncDate = rtrSyncDate(at)
  const sequence = await nextPlayerSequence(tx, location.id, syncDate)
  return tx.sharedPlayerEntry.create({
    data: {
      id: crypto.randomUUID(),
      email,
      rtrId: formatRtrId(location.countryCode, location.cityCode, syncDate, sequence),
      creatingClubId: clubId,
      locationCodeId: location.id,
      countryCode: location.countryCode,
      cityCode: location.cityCode,
      syncDate: new Date(`${syncDate}T00:00:00Z`),
      sequence,
      allocatedAt: at,
    },
  })
}

export type EmailResolution =
  /** The email is a registered ROTRA player's */
  | { kind: 'registered'; email: string; playerId: string }
  /** An unclaimed person; `created` when this save made the entry and its RTR ID */
  | { kind: 'unclaimed'; email: string; entryId: string; rtrId: string; created: boolean }

/**
 * What a club's email resolves to (D-2026-11-16-04): the registered player who has it, else the
 * open shared entry for it, else a new entry with a new RTR ID. Takes the email lock first.
 * `create: false` only reads (no entry is made for a new email: returns null).
 */
export async function resolveEmail(
  tx: Tx,
  clubId: string,
  email: string,
  now: Date,
  create = true,
): Promise<EmailResolution | null> {
  await lockEmail(tx, email)
  const playerId = await registeredPlayerByEmail(tx, email)
  if (playerId) return { kind: 'registered', email, playerId }
  const open = await openEntryByEmail(tx, email)
  if (open) return { kind: 'unclaimed', email, entryId: open.id, rtrId: open.rtrId, created: false }
  if (!create) return null
  const entry = await createSharedEntry(tx, clubId, email, now)
  return { kind: 'unclaimed', email, entryId: entry.id, rtrId: entry.rtrId, created: true }
}

/** The words after the name in the saved message, as the mock words them. */
export function emailWords(resolution: EmailResolution) {
  if (resolution.kind === 'registered') return 'linked to their ROTRA account'
  return resolution.created
    ? `unclaimed · ${resolution.rtrId}`
    : `already on ROTRA · ${resolution.rtrId}`
}

/**
 * The club's current saved record that already is this person (through its registered player or
 * its shared entry), other than `exceptId`.
 */
export function savedRecordFor(
  tx: Tx,
  clubId: string,
  resolution: EmailResolution,
  exceptId?: string,
) {
  return tx.clubPlayer.findFirst({
    where: {
      clubId,
      removedAt: null,
      ...(exceptId ? { id: { not: exceptId } } : {}),
      ...(resolution.kind === 'registered'
        ? { playerId: resolution.playerId }
        : { sharedEntryId: resolution.entryId, playerId: null }),
    },
    select: { id: true, displayName: true, player: { select: { fullName: true } } },
  })
}

/**
 * Points a club's record at the resolved person, keeping the club's own name, nickname and level.
 * A registered player's row keeps no copied nickname (the account's shows; the club nickname is
 * set on its own, D-2026-11-18-02). A removed row of this club for the same person is moved out of
 * the unique key's way only by refusing: the caller checks `savedRecordFor` first.
 */
export async function pointRecordAt(
  tx: Tx,
  clubId: string,
  clubPlayerId: string,
  resolution: EmailResolution,
) {
  const clash = await tx.clubPlayer.findFirst({
    where: {
      clubId,
      id: { not: clubPlayerId },
      ...(resolution.kind === 'registered'
        ? { playerId: resolution.playerId }
        : { sharedEntryId: resolution.entryId }),
    },
    select: { id: true },
  })
  // A deleted record of this club for the same person holds the per-club unique key; it stays
  // deleted with its history, and this record takes its place.
  if (clash)
    await tx.clubPlayer.update({
      where: { clubId_id: { clubId, id: clash.id } },
      data:
        resolution.kind === 'registered'
          ? { playerId: null, revision: { increment: 1 } }
          : { sharedEntryId: null, revision: { increment: 1 } },
    })
  await tx.clubPlayer.update({
    where: { clubId_id: { clubId, id: clubPlayerId } },
    data:
      resolution.kind === 'registered'
        ? { playerId: resolution.playerId, nickname: null, revision: { increment: 1 } }
        : { sharedEntryId: resolution.entryId, revision: { increment: 1 } },
  })
}

/**
 * A club deleted a record (D-2026-11-16-04): when it was the last current record pointing to an
 * open entry, the entry is retired. Its RTR ID is never reused and counters are not rewound; the
 * mistyped email is cleared so a later, correct save of it starts fresh.
 */
export async function retireEntryIfOrphan(tx: Tx, entryId: string | null, now: Date) {
  if (!entryId) return false
  const entry = await tx.sharedPlayerEntry.findUnique({ where: { id: entryId } })
  if (!entry || entry.claimedPlayerId || entry.retiredAt) return false
  const current = await tx.clubPlayer.count({
    where: { sharedEntryId: entryId, removedAt: null },
  })
  if (current) return false
  await tx.sharedPlayerEntry.update({
    where: { id: entryId },
    data: { retiredAt: now, email: null, revision: { increment: 1 } },
  })
  return true
}

/**
 * Registration (step 1, inside the staging transaction): when an open shared entry has the
 * registering email, the new player's allocation copies the entry's RTR ID instead of allocating a
 * new one (the person keeps it, D-2026-11-16-04). Returns the copied RTR ID, or null.
 */
export async function adoptEntryAllocation(
  tx: Tx,
  playerId: string,
  emails: (string | null | undefined)[],
) {
  for (const typed of emails) {
    const email = normalizeEmail(typed)
    if (!email) continue
    await lockEmail(tx, email)
    const entry = await openEntryByEmail(tx, email)
    if (!entry) continue
    const taken = await tx.playerIdAllocation.findUnique({
      where: { rtrId: entry.rtrId },
      select: { playerId: true },
    })
    if (taken) return taken.playerId === playerId ? entry.rtrId : null
    await tx.playerIdAllocation.create({
      data: {
        playerId,
        rtrId: entry.rtrId,
        creatingClubId: entry.creatingClubId,
        locationCodeId: entry.locationCodeId,
        countryCode: entry.countryCode,
        cityCode: entry.cityCode,
        syncDate: entry.syncDate,
        sequence: entry.sequence,
      },
    })
    return entry.rtrId
  }
  return null
}

/**
 * Registration (step 2, once the account exists): the open shared entry whose email is the
 * person's ROTRA email or Google email is claimed, and every current club record pointing to it
 * links to the account with its games (`club_player_id` keeps them; no history attribution row is
 * written, still open). One record per club: a club that already lists the account keeps that row.
 * `identityRecordId` is the picked club's version: it seeded the registration form (name and
 * nickname); club pictures and levels are not stored in real mode, so nothing else is copied.
 * Repeat-safe.
 */
export async function claimSharedEntry(
  tx: Tx,
  playerId: string,
  emails: (string | null | undefined)[],
  now: Date,
  identityRecordId?: string | null,
) {
  const already = await tx.sharedPlayerEntry.findUnique({ where: { claimedPlayerId: playerId } })
  let entry = already
  if (!entry)
    for (const typed of emails) {
      const email = normalizeEmail(typed)
      if (!email) continue
      await lockEmail(tx, email)
      entry = await openEntryByEmail(tx, email)
      if (entry) break
    }
  if (!entry) return { linked: [] as { clubId: string; clubPlayerId: string }[] }
  const records = await tx.clubPlayer.findMany({
    where: { sharedEntryId: entry.id, removedAt: null },
    orderBy: [{ addedAt: 'asc' }, { id: 'asc' }],
    select: { id: true, clubId: true, playerId: true },
  })
  // The pick only seeded the form (name and nickname); a stale pick never blocks the join.
  void identityRecordId
  if (!already)
    await tx.sharedPlayerEntry.update({
      where: { id: entry.id },
      data: { claimedPlayerId: playerId, claimedAt: now, email: null, revision: { increment: 1 } },
    })
  const linked: { clubId: string; clubPlayerId: string }[] = []
  for (const record of records) {
    if (record.playerId) continue
    const existing = await tx.clubPlayer.findUnique({
      where: { clubId_playerId: { clubId: record.clubId, playerId } },
      select: { id: true },
    })
    if (existing) continue
    await tx.clubPlayer.update({
      where: { clubId_id: { clubId: record.clubId, id: record.id } },
      // The club's nickname for an unclaimed person was their nickname, not a club nickname.
      data: { playerId, nickname: null, revision: { increment: 1 } },
    })
    linked.push({ clubId: record.clubId, clubPlayerId: record.id })
  }
  return { linked }
}

/**
 * Admin's RTR ID change (D-2026-11-16-04, no alias): replaces `from` with `to` on every record that
 * stores the RTR ID string, in the caller's transaction: `shared_player_entries.rtr_id` and
 * `player_id_allocations.rtr_id` (a registered person's copy) with their place and date columns.
 * No other table or snapshot stores the string (checked for P15.8). The new place and date get a
 * counter row whose last sequence is raised to at least this number, so the counter never hands it
 * out again. A taken RTR ID is refused.
 */
export async function replaceRtrId(
  tx: Tx,
  from: string,
  to: { rtrId: string; locationCodeId: string; syncDate: string; sequence: number },
) {
  const location = await tx.locationCode.findUnique({ where: { id: to.locationCodeId } })
  if (!location) throw new ServiceError('invalid', { registrationPlace: 'Choose a place.' })
  const taken =
    (await tx.sharedPlayerEntry.findFirst({
      where: {
        OR: [
          { rtrId: to.rtrId },
          {
            locationCodeId: to.locationCodeId,
            syncDate: new Date(`${to.syncDate}T00:00:00Z`),
            sequence: to.sequence,
          },
        ],
        NOT: { rtrId: from },
      },
      select: { id: true },
    })) ??
    (await tx.playerIdAllocation.findFirst({
      where: {
        OR: [
          { rtrId: to.rtrId },
          {
            locationCodeId: to.locationCodeId,
            syncDate: new Date(`${to.syncDate}T00:00:00Z`),
            sequence: to.sequence,
          },
        ],
        NOT: { rtrId: from },
      },
      select: { playerId: true },
    }))
  if (taken) throw new ServiceError('conflict', { registrationDate: ADMIN_PLAYER_RTR_ID_TAKEN })
  await tx.$executeRaw`
    INSERT INTO "player_id_counters" ("location_code_id", "sync_date", "last_sequence")
    VALUES (${to.locationCodeId}::uuid, ${to.syncDate}::date, ${to.sequence})
    ON CONFLICT ("location_code_id", "sync_date")
    DO UPDATE SET "last_sequence" = GREATEST("player_id_counters"."last_sequence", EXCLUDED."last_sequence")`
  const data = {
    rtrId: to.rtrId,
    locationCodeId: to.locationCodeId,
    countryCode: location.countryCode,
    cityCode: location.cityCode,
    syncDate: new Date(`${to.syncDate}T00:00:00Z`),
  }
  const entries = await tx.sharedPlayerEntry.updateMany({
    where: { rtrId: from },
    data: { ...data, revision: { increment: 1 } },
  })
  // player_id_allocations is append-only except this change, allowed by its trigger only while
  // the transaction-local setting is on (migration 20261118000300_shared_player_entries).
  await tx.$executeRaw`SELECT set_config('rotra.rtr_id_change', 'on', true)`
  const allocations = await tx.playerIdAllocation.updateMany({ where: { rtrId: from }, data })
  await tx.$executeRaw`SELECT set_config('rotra.rtr_id_change', 'off', true)`
  return { entries: entries.count, allocations: allocations.count }
}
