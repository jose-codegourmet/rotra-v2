import 'server-only'
import type { AdminContext, ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { ClubLicenseTerm, LicensePlan, Prisma } from '../generated/prisma/client'
import { ServiceError } from '../service/errors'
import { toDateOnly, toIso, toIsoOrNull, toMoney } from '../service/serialize'
import { recordAudit } from './audit'
import { lockClub } from './clubs'
import { retainPublicationsUnderCycle } from './retention'

type Tx = Prisma.TransactionClient

/** Six-month public-page countdown after expiry (business rule; deadline policy in #245/#248). */
export const PUBLIC_PAGE_RETENTION_MONTHS = 6

const addMonths = (at: Date, months: number) => {
  const next = new Date(at)
  next.setUTCMonth(next.getUTCMonth() + months)
  return next
}

export function termDto(term: ClubLicenseTerm) {
  return {
    id: term.id,
    clubId: term.clubId,
    plan: term.plan,
    startsAt: toIso(term.startsAt),
    endsAt: toIso(term.endsAt),
    activatedAt: toIso(term.activatedAt),
    pricingAtActivation: term.pricingAtActivation,
    paidOn: term.paidOn ? toDateOnly(term.paidOn) : null,
    amount: toMoney(term.amountMinor, term.currency),
    paymentReference: term.paymentReference,
    notes: term.notes ?? '',
  }
}

/**
 * Recomputes `club_entitlements` from the club's terms at `now`: the term covering now with the
 * latest end wins. Starts an expiry cycle when access has just lapsed and none is running.
 * Call with the club row locked.
 */
export async function refreshEntitlement(tx: Tx, clubId: string, now = new Date()) {
  const terms = await tx.clubLicenseTerm.findMany({
    where: { clubId, startsAt: { lte: now } },
    orderBy: [{ endsAt: 'desc' }, { id: 'asc' }],
    take: 1,
  })
  const latest = terms[0] ?? null
  const live = latest && latest.endsAt > now ? latest : null
  let cycleId: string | null = null
  const running = await tx.clubExpiryCycle.findFirst({ where: { clubId, state: 'running' } })
  if (live) cycleId = null
  else if (running) cycleId = running.id
  else if (latest) {
    const cycle = await tx.clubExpiryCycle.create({
      data: {
        clubId,
        expiredAt: latest.endsAt,
        deletePublicPagesAfter: addMonths(latest.endsAt, PUBLIC_PAGE_RETENTION_MONTHS),
      },
    })
    cycleId = cycle.id
    // Each later expiry is a new cycle; pages are retained under it, never an old deadline.
    await retainPublicationsUnderCycle(tx, clubId, cycle.id)
  }
  return tx.clubEntitlement.upsert({
    where: { clubId },
    create: {
      clubId,
      effectiveTermId: live?.id ?? null,
      effectiveAccessEndsAt: live?.endsAt ?? null,
      currentExpiryCycleId: cycleId,
      refreshedAt: now,
    },
    update: {
      effectiveTermId: live?.id ?? null,
      effectiveAccessEndsAt: live?.endsAt ?? null,
      currentExpiryCycleId: cycleId,
      refreshedAt: now,
      revision: { increment: 1 },
    },
  })
}

async function nextPaymentReference(tx: Tx) {
  const count = await tx.clubLicenseTerm.count()
  return `LIC-${String(count + 1).padStart(4, '0')}`
}

/**
 * A-CLUB · Activate / Renew license. Locks the club, appends one term, refreshes entitlement and
 * cancels the exact running expiry cycle, all in one transaction. Repeat-safe on `commandId`: a
 * concurrent or repeated call applies one term. Prices on the club are never rewritten.
 *
 * Proposal (stacking pending #245): a renewal starts when current access ends, or now if lapsed.
 */
export async function activateLicense(
  context: AdminContext,
  input: {
    commandId: string
    clubId: string
    plan: LicensePlan
    /** Prefilled from the club's price for the plan, editable; ignored for a free club. */
    amountMinor?: number
    paidOn?: string | null
    notes?: string
  },
) {
  if (input.plan !== 'monthly' && input.plan !== 'yearly')
    throw new ServiceError('invalid', { plan: 'Choose monthly or yearly.' })
  return prisma.$transaction(async (tx) => {
    const club = await lockClub(tx, input.clubId)
    const repeated = await tx.clubLicenseTerm.findUnique({
      where: { sourceCommandId: input.commandId },
    })
    if (repeated) {
      if (repeated.clubId !== club.id) throw new ServiceError('conflict')
      return termDto(repeated)
    }
    const now = new Date()
    const free = club.licensePricing === 'free'
    const listed = input.plan === 'monthly' ? club.licenseMonthlyMinor : club.licenseYearlyMinor
    const amountMinor = free ? 0 : (input.amountMinor ?? listed)
    if (amountMinor == null || !Number.isSafeInteger(amountMinor) || amountMinor < 0)
      throw new ServiceError('invalid', { amount: 'Enter the amount the club paid.' })
    if (!free && !input.paidOn)
      throw new ServiceError('invalid', { paidOn: 'Enter the date the club paid.' })
    const entitlement = await tx.clubEntitlement.findUnique({ where: { clubId: club.id } })
    const accessEnd = entitlement?.effectiveAccessEndsAt
    const startsAt = accessEnd && accessEnd > now ? accessEnd : now
    const endsAt = addMonths(startsAt, input.plan === 'monthly' ? 1 : 12)
    const term = await tx.clubLicenseTerm.create({
      data: {
        clubId: club.id,
        plan: input.plan,
        startsAt,
        endsAt,
        activatedByAdminId: context.adminId,
        activatedAt: now,
        sourceCommandId: input.commandId,
        pricingAtActivation: club.licensePricing,
        paidOn: free || !input.paidOn ? null : new Date(`${input.paidOn}T00:00:00Z`),
        amountMinor,
        currency: club.currency,
        paymentReference: await nextPaymentReference(tx),
        notes: input.notes?.trim() || null,
      },
    })
    // Renewal cancels the exact running cycle, so a queued deletion for it exits (F07.32).
    await tx.clubExpiryCycle.updateMany({
      where: { clubId: club.id, state: 'running' },
      data: {
        state: 'cancelled',
        cancelledAt: now,
        cancellationTermId: term.id,
        revision: { increment: 1 },
      },
    })
    await refreshEntitlement(tx, club.id, now)
    await recordAudit(tx, context, {
      action: entitlement?.effectiveTermId ? 'club.license_renewed' : 'club.license_activated',
      targetType: 'club',
      targetId: club.id,
      sourceCommandId: input.commandId,
      metadata: { plan: input.plan, amountMinor, termId: term.id },
    })
    return termDto(term)
  })
}

/** License payments table (A-CLUB and Q-CLUB), newest first. */
export async function readLicenseTerms(clubId: string) {
  const terms = await prisma.clubLicenseTerm.findMany({
    where: { clubId },
    orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
  })
  return terms.map(termDto)
}

export async function readOwnLicense(context: ClubContext) {
  const entitlement = await prisma.clubEntitlement.findUnique({
    where: { clubId: context.clubId },
    include: { currentExpiryCycle: true },
  })
  return {
    accessEndsAt: toIsoOrNull(entitlement?.effectiveAccessEndsAt),
    active: !!entitlement?.effectiveAccessEndsAt && entitlement.effectiveAccessEndsAt > new Date(),
    publicPagesDeleteAfter: toIsoOrNull(entitlement?.currentExpiryCycle?.deletePublicPagesAfter),
    payments: await readLicenseTerms(context.clubId),
  }
}

/** Scheduled sweep: refreshes every club whose recorded access end has passed. */
export async function refreshLapsedEntitlements(now = new Date()) {
  const lapsed = await prisma.clubEntitlement.findMany({
    where: { effectiveAccessEndsAt: { lte: now } },
    select: { clubId: true },
  })
  for (const { clubId } of lapsed)
    await prisma.$transaction(async (tx) => {
      await lockClub(tx, clubId)
      await refreshEntitlement(tx, clubId, now)
    })
  return { refreshed: lapsed.length }
}
