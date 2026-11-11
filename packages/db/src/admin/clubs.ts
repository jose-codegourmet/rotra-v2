import 'server-only'
import { newClubInviteCode } from '@rotra/data/club/invite-code'
import type { AdminContext, ClubContext } from '../auth/account-context'
import { type ProviderAdmin, ProviderError } from '../auth/provider-admin'
import { AUTH_PROVIDER } from '../auth/supabase'
import { prisma } from '../client/prisma'
import type { Club, ClubVenue, LicensePricing, Prisma } from '../generated/prisma/client'
import { requireClubEntitlement, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toDecimalString, toIso, toIsoOrNull, toMoney } from '../service/serialize'
import { recordAudit } from './audit'
import { clubNameKey, normalizeClubUsername } from './club-identity'
import { readClubInvite } from './club-invite'
import { adminTermDto } from './licenses'

type Tx = Prisma.TransactionClient

export type ClubPricingInput =
  | { pricing: 'paid'; monthlyMinor: number; yearlyMinor: number }
  | { pricing: 'free' }

/** Paid: both amounts positive whole centavos and yearly below twelve months. Free needs none. */
function validatePricing(input: ClubPricingInput) {
  if (input.pricing === 'free') return
  const { monthlyMinor, yearlyMinor } = input
  if (
    !Number.isSafeInteger(monthlyMinor) ||
    !Number.isSafeInteger(yearlyMinor) ||
    monthlyMinor <= 0 ||
    yearlyMinor <= 0
  )
    throw new ServiceError('invalid', { price: 'Enter a monthly and yearly price.' })
  if (yearlyMinor >= 12 * monthlyMinor)
    throw new ServiceError('invalid', { price: 'The yearly price must be less than 12 months.' })
}

/** Admin view of a club. The account shows provisioning state, never a password or subject. */
function adminClubDto(
  club: Club,
  account: { username: string; provisionedAt: Date | null; disabledAt: Date | null } | null,
) {
  return {
    id: club.id,
    name: club.name,
    logoRef: club.logoRef,
    foundingLocationCodeId: club.foundingLocationCodeId,
    foundingAddress: club.foundingAddress,
    licensePricing: club.licensePricing,
    licenseMonthly: toMoney(club.licenseMonthlyMinor, club.currency),
    licenseYearly: toMoney(club.licenseYearlyMinor, club.currency),
    username: account?.username ?? null,
    accountState: !account
      ? 'missing'
      : account.disabledAt
        ? 'disabled'
        : account.provisionedAt
          ? 'ready'
          : 'provisioning',
    createdAt: toIso(club.createdAt),
    revision: toDecimalString(club.revision),
  }
}

/** Club-side settings view (Q-CLUB). */
export function clubSettingsDto(club: Club) {
  return {
    id: club.id,
    name: club.name,
    logoRef: club.logoRef,
    defaultPlayersPerCourt: club.defaultPlayersPerCourt,
    defaultEntranceFee: toMoney(club.defaultEntranceFeeMinor, club.currency),
    description: club.description ?? '',
    courtRules: club.courtRules ?? '',
    postTemplate: club.postTemplate,
    revision: toDecimalString(club.revision),
  }
}

export function venueDto(venue: ClubVenue) {
  return {
    id: venue.id,
    clubId: venue.clubId,
    name: venue.name,
    address: venue.address ?? '',
    courtFeePerCourtHour: toMoney(venue.courtFeePerCourtHourMinor, venue.currency),
    entranceFee: toMoney(venue.entranceFeeMinor, venue.currency),
    revision: toDecimalString(venue.revision),
  }
}

/** Locks one club row for the transaction, serializing price, license and name changes per club. */
export async function lockClub(tx: Tx, clubId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "clubs" WHERE "id" = ${clubId}::uuid FOR UPDATE`
  if (!rows.length) throw new ServiceError('not_found')
  return tx.club.findUniqueOrThrow({ where: { id: clubId } })
}

function mapUnique(error: unknown, fields: Record<string, string>): never {
  const code = (error as { code?: string })?.code
  if (code === 'P2002') throw new ServiceError('conflict', fields)
  throw error
}

/**
 * A-ADD-CLUB, stage 1: one transaction inserts the club, its price and a staged `club_accounts` row
 * with no provider subject yet. Repeat-safe on `commandId`: a retry returns the same club. A new
 * Free club stores no paid prices and no license history.
 */
export async function stageClub(
  context: AdminContext,
  input: {
    commandId: string
    name: string
    foundingLocationCodeId: string
    foundingAddress: string
    username: string
    pricing: ClubPricingInput
  },
) {
  const name = input.name.trim()
  const username = normalizeClubUsername(input.username)
  if (!name || !input.foundingAddress.trim() || !username)
    throw new ServiceError('invalid', { club: 'Enter a club name, address and username.' })
  validatePricing(input.pricing)
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.club.findUnique({
        where: { sourceCommandId: input.commandId },
        include: { account: true },
      })
      if (existing) return adminClubDto(existing, existing.account)
      const location = await tx.locationCode.findUnique({
        where: { id: input.foundingLocationCodeId },
      })
      if (!location) throw new ServiceError('invalid', { location: 'Choose a founding city.' })
      const club = await tx.club.create({
        data: {
          name,
          nameKey: clubNameKey(name),
          foundingLocationCodeId: location.id,
          foundingAddress: input.foundingAddress.trim(),
          licensePricing: input.pricing.pricing,
          licenseMonthlyMinor: input.pricing.pricing === 'paid' ? input.pricing.monthlyMinor : null,
          licenseYearlyMinor: input.pricing.pricing === 'paid' ? input.pricing.yearlyMinor : null,
          sourceCommandId: input.commandId,
          // The club invite link works from day one (#712); Regenerate link replaces it.
          inviteCode: newClubInviteCode(),
        },
      })
      const account = await tx.clubAccount.create({
        data: { clubId: club.id, username, authProvider: AUTH_PROVIDER },
      })
      await tx.clubEntitlement.create({ data: { clubId: club.id, refreshedAt: new Date() } })
      await recordAudit(tx, context, {
        action: 'club.created',
        targetType: 'club',
        targetId: club.id,
        sourceCommandId: input.commandId,
        metadata: { pricing: input.pricing.pricing },
      })
      return adminClubDto(club, account)
    })
  } catch (error) {
    mapUnique(error, { name: 'A club with this name or username already exists.' })
  }
}

/**
 * A-ADD-CLUB, stage 2: creates the provider credential outside any transaction, then records the
 * subject. A provider failure leaves the staged account unprovisioned and the same call resumes it
 * (the operation ref is the club ID). Repeat-safe once provisioned.
 */
export async function provisionClubAccount(
  context: AdminContext,
  provider: ProviderAdmin,
  input: { clubId: string; initialPassword: string },
) {
  const account = await prisma.clubAccount.findUnique({ where: { clubId: input.clubId } })
  if (!account) throw new ServiceError('not_found')
  if (account.provisionedAt) return { clubId: account.clubId, accountState: 'ready' as const }
  let subject: string
  try {
    subject = (
      await provider.createLogin({
        operationRef: account.clubId,
        username: account.username,
        initialPassword: input.initialPassword,
      })
    ).subject
  } catch (error) {
    if (error instanceof ProviderError) throw new ServiceError('unavailable')
    throw error
  }
  return prisma.$transaction(async (tx) => {
    const current = await tx.clubAccount.findUniqueOrThrow({ where: { clubId: input.clubId } })
    if (current.provisionedAt) {
      if (current.authSubject !== subject) throw new ServiceError('conflict')
      return { clubId: current.clubId, accountState: 'ready' as const }
    }
    await tx.clubAccount.update({
      where: { clubId: current.clubId },
      data: { authSubject: subject, provisionedAt: new Date(), revision: { increment: 1 } },
    })
    await recordAudit(tx, context, {
      action: 'club.account_provisioned',
      targetType: 'club',
      targetId: current.clubId,
    })
    return { clubId: current.clubId, accountState: 'ready' as const }
  })
}

/** A-CLUB price change. Existing license terms keep their recorded amounts. */
export async function setClubPricing(
  context: AdminContext,
  input: { commandId: string; clubId: string; expectedRevision: string; pricing: ClubPricingInput },
) {
  validatePricing(input.pricing)
  return prisma.$transaction(async (tx) => {
    const done = await tx.adminAuditEvent.findUnique({
      where: { sourceCommandId: input.commandId },
    })
    const club = await lockClub(tx, input.clubId)
    if (done)
      return adminClubDto(club, await tx.clubAccount.findUnique({ where: { clubId: club.id } }))
    requireRevision(club.revision, input.expectedRevision)
    const before = {
      pricing: club.licensePricing,
      monthlyMinor: club.licenseMonthlyMinor,
      yearlyMinor: club.licenseYearlyMinor,
    }
    // Switching to Free keeps the last paid price so switching back starts from it (#245).
    const updated = await tx.club.update({
      where: { id: club.id },
      data:
        input.pricing.pricing === 'paid'
          ? {
              licensePricing: 'paid' as LicensePricing,
              licenseMonthlyMinor: input.pricing.monthlyMinor,
              licenseYearlyMinor: input.pricing.yearlyMinor,
              revision: { increment: 1 },
            }
          : { licensePricing: 'free' as LicensePricing, revision: { increment: 1 } },
    })
    await recordAudit(tx, context, {
      action: 'club.price_changed',
      targetType: 'club',
      targetId: club.id,
      sourceCommandId: input.commandId,
      metadata: {
        before,
        after: {
          pricing: updated.licensePricing,
          monthlyMinor: updated.licenseMonthlyMinor,
          yearlyMinor: updated.licenseYearlyMinor,
        },
      },
    })
    return adminClubDto(updated, await tx.clubAccount.findUnique({ where: { clubId: club.id } }))
  })
}

export async function readClubsForAdmin(context: AdminContext) {
  void context
  const clubs = await prisma.club.findMany({
    include: { account: { select: { username: true, provisionedAt: true, disabledAt: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  })
  return clubs.map((club) => adminClubDto(club, club.account))
}

/**
 * A-CLUBS / A-CLUB-DETAIL read (F07.34): each club with its account state, founding city and
 * recorded license terms, so the Admin app derives access and retention with its existing rules.
 * `clubId` narrows to one club; an unknown ID returns an empty list.
 */
export async function readAdminClubDirectory(context: AdminContext, clubId?: string) {
  void context
  const clubs = await prisma.club.findMany({
    where: clubId ? { id: clubId } : undefined,
    include: {
      account: { select: { username: true, provisionedAt: true, disabledAt: true } },
      foundingLocation: { select: { countryCode: true, cityCode: true, displayName: true } },
      licenseTerms: {
        orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
        include: { activatedBy: { select: { displayName: true } } },
      },
      nameChanges: {
        where: { state: 'pending' },
        orderBy: [{ requestedAt: 'desc' }, { id: 'asc' }],
        take: 1,
        select: { id: true, requestedName: true, requestedAt: true },
      },
      queueSessions: {
        where: { state: { in: ['active', 'finalizing'] } },
        orderBy: [{ startedAt: 'desc' }, { id: 'asc' }],
        take: 1,
        select: { title: true, venueName: true, startedAt: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  })
  const auditEvents = await prisma.adminAuditEvent.findMany({
    where: {
      targetType: 'club',
      targetId: { in: clubs.map((club) => club.id) },
      action: 'club.name_change_approved',
    },
    orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    select: { targetId: true, metadata: true },
  })
  const earlierNames = new Map<string, string[]>()
  for (const event of auditEvents) {
    const metadata = event.metadata as unknown
    const candidate =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>).before
        : null
    const name = typeof candidate === 'string' ? candidate : null
    if (name) earlierNames.set(event.targetId, [...(earlierNames.get(event.targetId) ?? []), name])
  }
  return clubs.map((club) => ({
    ...adminClubDto(club, club.account),
    provisionedAt: toIsoOrNull(club.account?.provisionedAt),
    city: club.foundingLocation.displayName,
    cityCode: `${club.foundingLocation.countryCode}-${club.foundingLocation.cityCode}`,
    terms: club.licenseTerms.map(adminTermDto),
    pendingNameRequest: club.nameChanges[0]
      ? {
          id: club.nameChanges[0].id,
          requestedName: club.nameChanges[0].requestedName,
          requestedAt: toIso(club.nameChanges[0].requestedAt),
        }
      : null,
    runningSession: club.queueSessions[0]
      ? {
          title: club.queueSessions[0].title,
          venueName: club.queueSessions[0].venueName ?? '',
          startedAt: toIsoOrNull(club.queueSessions[0].startedAt) ?? '',
        }
      : null,
    earlierNames: earlierNames.get(club.id) ?? [],
  }))
}

/** A-ADD-CLUB duplicate check before review: taken club names and account usernames. */
export async function readClubIdentityIndex(context: AdminContext) {
  void context
  const [clubs, accounts] = await Promise.all([
    prisma.club.findMany({ select: { name: true } }),
    prisma.clubAccount.findMany({ select: { username: true } }),
  ])
  return { names: clubs.map((c) => c.name), usernames: accounts.map((a) => a.username) }
}

/** The founding city for an A-ADD-CLUB city code such as `PH-CEB`; null when not offered. */
export async function findLocationCode(code: string) {
  const [countryCode, cityCode] = code.split('-')
  if (!countryCode || !cityCode) return null
  return prisma.locationCode.findUnique({
    where: { countryCode_cityCode: { countryCode, cityCode } },
    select: { id: true },
  })
}

/** Q-CLUB settings read. Allowed after expiry so the club can see its own details. */
export async function readClubSettings(context: ClubContext) {
  // Fills the club invite code first for a club that has none yet (#712).
  const { inviteCode } = await readClubInvite(context)
  const club = await prisma.club.findUniqueOrThrow({
    where: { id: context.clubId },
    include: {
      account: { select: { username: true } },
      foundingLocation: { select: { countryCode: true, cityCode: true, displayName: true } },
      nameChanges: {
        where: { state: 'pending' },
        orderBy: [{ requestedAt: 'desc' }, { id: 'asc' }],
        take: 1,
        select: { requestedName: true, requestedAt: true },
      },
    },
  })
  return {
    ...clubSettingsDto(club),
    foundingAddress: club.foundingAddress,
    city: club.foundingLocation.displayName,
    cityCode: `${club.foundingLocation.countryCode}-${club.foundingLocation.cityCode}`,
    username: club.account?.username ?? '',
    inviteCode: club.inviteCode ?? inviteCode,
    licensePricing: club.licensePricing,
    licenseMonthly: toMoney(club.licenseMonthlyMinor, club.currency),
    licenseYearly: toMoney(club.licenseYearlyMinor, club.currency),
    pendingNameChange: club.nameChanges[0]
      ? {
          requestedName: club.nameChanges[0].requestedName,
          requestedAt: toIso(club.nameChanges[0].requestedAt),
        }
      : null,
  }
}

/** Q-CLUB settings the club may edit itself. The name changes only through a request. */
export async function updateClubSettings(
  context: ClubContext,
  input: {
    expectedRevision: string
    logoRef?: string | null
    defaultPlayersPerCourt?: number
    defaultEntranceFeeMinor?: number | null
    description?: string
    courtRules?: string
    postTemplate?: string | null
  },
) {
  await requireClubEntitlement(context)
  if (
    input.defaultPlayersPerCourt !== undefined &&
    (!Number.isInteger(input.defaultPlayersPerCourt) ||
      input.defaultPlayersPerCourt < 2 ||
      input.defaultPlayersPerCourt > 20)
  )
    throw new ServiceError('invalid', {
      playersPerCourt: 'Players per court must be between 2 and 20.',
    })
  if (
    input.defaultEntranceFeeMinor != null &&
    (!Number.isSafeInteger(input.defaultEntranceFeeMinor) || input.defaultEntranceFeeMinor < 0)
  )
    throw new ServiceError('invalid', { entranceFee: 'Enter an amount of zero or more.' })
  return prisma.$transaction(async (tx) => {
    const club = await lockClub(tx, context.clubId)
    requireRevision(club.revision, input.expectedRevision)
    const updated = await tx.club.update({
      where: { id: club.id },
      data: {
        logoRef: input.logoRef,
        defaultPlayersPerCourt: input.defaultPlayersPerCourt,
        defaultEntranceFeeMinor: input.defaultEntranceFeeMinor,
        description: input.description?.trim(),
        courtRules: input.courtRules?.trim(),
        postTemplate: input.postTemplate,
        revision: { increment: 1 },
      },
    })
    return clubSettingsDto(updated)
  })
}

/** Q-CLUB · Request name change. One pending request per club (partial unique in SQL). */
export async function requestClubNameChange(
  context: ClubContext,
  input: { commandId: string; name: string },
) {
  await requireClubEntitlement(context)
  const name = input.name.trim()
  if (!name) throw new ServiceError('invalid', { name: 'Enter a club name.' })
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.clubNameChangeRequest.findUnique({
        where: { sourceCommandId: input.commandId },
      })
      if (existing) {
        if (existing.clubId !== context.clubId) throw new ServiceError('not_found')
        return nameChangeDto(existing)
      }
      const key = clubNameKey(name)
      const taken = await tx.club.findUnique({ where: { nameKey: key }, select: { id: true } })
      if (taken && taken.id !== context.clubId)
        throw new ServiceError('conflict', { name: 'A club with this name already exists.' })
      const request = await tx.clubNameChangeRequest.create({
        data: {
          clubId: context.clubId,
          requestedName: name,
          requestedNameKey: key,
          requestedAt: new Date(),
          sourceCommandId: input.commandId,
        },
      })
      return nameChangeDto(request)
    })
  } catch (error) {
    mapUnique(error, { name: 'This club already has a pending name change.' })
  }
}

function nameChangeDto(request: {
  id: string
  clubId: string
  requestedName: string
  requestedAt: Date
  state: string
  reviewedAt: Date | null
}) {
  return {
    id: request.id,
    clubId: request.clubId,
    requestedName: request.requestedName,
    requestedAt: toIso(request.requestedAt),
    state: request.state,
    reviewedAt: toIsoOrNull(request.reviewedAt),
  }
}

/**
 * A-REQUESTS name review. Approval rechecks uniqueness and updates `clubs.name` in the same
 * transaction; the founding location never changes. Repeat-safe for the same decision.
 */
export async function reviewClubNameChange(
  context: AdminContext,
  input: { requestId: string; decision: 'approved' | 'rejected' },
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.clubNameChangeRequest.findUnique({ where: { id: input.requestId } })
      if (!request) throw new ServiceError('not_found')
      const club = await lockClub(tx, request.clubId)
      if (request.state !== 'pending') {
        if (request.state === input.decision) return nameChangeDto(request)
        throw new ServiceError('conflict', { request: 'This request has already been decided.' })
      }
      const now = new Date()
      if (input.decision === 'approved') {
        const taken = await tx.club.findUnique({ where: { nameKey: request.requestedNameKey } })
        if (taken && taken.id !== club.id)
          throw new ServiceError('conflict', { name: 'A club with this name already exists.' })
        await tx.club.update({
          where: { id: club.id },
          data: {
            name: request.requestedName,
            nameKey: request.requestedNameKey,
            revision: { increment: 1 },
          },
        })
      }
      const decided = await tx.clubNameChangeRequest.update({
        where: { id: request.id },
        data: {
          state: input.decision,
          reviewedByAdminId: context.adminId,
          reviewedAt: now,
          revision: { increment: 1 },
        },
      })
      await recordAudit(tx, context, {
        action: `club.name_change_${input.decision}`,
        targetType: 'club',
        targetId: club.id,
        metadata: {
          before: club.name,
          after: input.decision === 'approved' ? request.requestedName : club.name,
        },
      })
      return nameChangeDto(decided)
    })
  } catch (error) {
    mapUnique(error, { name: 'A club with this name already exists.' })
  }
}

function validateFee(value: number | null | undefined, field: string) {
  if (value != null && (!Number.isSafeInteger(value) || value < 0))
    throw new ServiceError('invalid', { [field]: 'Enter an amount of zero or more.' })
}

export async function readVenues(context: ClubContext) {
  const venues = await prisma.clubVenue.findMany({
    where: { clubId: context.clubId },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  })
  return venues.map(venueDto)
}

/**
 * Creates or edits a saved venue. Editing never rewrites sessions that already copied it. The id
 * is the client's stable command ID, so a retried create returns the same venue.
 */
export async function saveVenue(
  context: ClubContext,
  input: {
    id: string
    expectedRevision?: string
    name: string
    address?: string
    courtFeePerCourtHourMinor?: number | null
    entranceFeeMinor?: number | null
  },
) {
  await requireClubEntitlement(context)
  const name = input.name.trim()
  if (!name) throw new ServiceError('invalid', { name: 'Enter a venue name.' })
  validateFee(input.courtFeePerCourtHourMinor, 'courtFee')
  validateFee(input.entranceFeeMinor, 'entranceFee')
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.clubVenue.findUnique({ where: { id: input.id } })
      if (existing && existing.clubId !== context.clubId) throw new ServiceError('not_found')
      const data = {
        name,
        address: input.address?.trim() || null,
        courtFeePerCourtHourMinor: input.courtFeePerCourtHourMinor ?? null,
        entranceFeeMinor: input.entranceFeeMinor ?? null,
      }
      if (!existing)
        return venueDto(
          await tx.clubVenue.create({ data: { id: input.id, clubId: context.clubId, ...data } }),
        )
      if (input.expectedRevision === undefined) return venueDto(existing)
      requireRevision(existing.revision, input.expectedRevision)
      return venueDto(
        await tx.clubVenue.update({
          where: { id: existing.id },
          data: { ...data, revision: { increment: 1 } },
        }),
      )
    })
  } catch (error) {
    mapUnique(error, { name: 'This club already has a venue with this name.' })
  }
}
