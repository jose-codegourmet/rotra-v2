import 'server-only'
import { formatClubPriceLine } from '@rotra/data/club/rules'
import { CONTACT_FIELD_WORD } from '@rotra/data/contact-change-request/rules'
import { licenseAuditSummary, manilaToday } from '@rotra/data/license/rules'
import type { AdminContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma } from '../generated/prisma/client'
import { requireAdmin } from '../service/authorize'
import { toIso } from '../service/serialize'

type Tx = Prisma.TransactionClient

/**
 * Appends one platform-owner audit event in the caller's transaction. `metadata` carries redacted
 * before/after values only: never passwords, tokens or contact values. Repeat-safe on the command.
 */
export async function recordAudit(
  tx: Tx,
  context: AdminContext,
  event: {
    action: string
    targetType: string
    targetId: string
    sourceCommandId?: string
    metadata?: Prisma.InputJsonValue
  },
) {
  if (event.sourceCommandId) {
    const existing = await tx.adminAuditEvent.findUnique({
      where: { sourceCommandId: event.sourceCommandId },
    })
    if (existing) return existing
  }
  return tx.adminAuditEvent.create({
    data: {
      actorAdminId: context.adminId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      sourceCommandId: event.sourceCommandId ?? null,
      metadata: event.metadata,
    },
  })
}

/** The record types the Admin "Record of actions" reads in real mode (#401). */
export type AuditReadTarget = 'club' | 'player' | 'contact_change_request'

/** One allowlisted log line: no actor ID, no raw metadata, only the plain-language summary. */
export type AuditEventDto = {
  id: string
  action: string
  targetType: AuditReadTarget
  targetId: string
  at: string
  /** The acting owner's display name (never an ID or email) */
  actor: string
  summary: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Stored action code → the Admin UI action code. Actions with no prototype log line are left out. */
const UI_ACTION: Record<string, string> = {
  'club.created': 'club_created',
  'club.price_changed': 'club_price_changed',
  'club.name_change_approved': 'club_name_change_approved',
  'club.name_change_rejected': 'club_name_change_rejected',
  'club.license_activated': 'license_activated',
  'club.license_renewed': 'license_renewed',
  'player.contact_change_submitted': 'contact_change_submitted',
  'player.contact_change_approved': 'contact_change_approved',
  'player.contact_change_rejected': 'contact_change_declined',
  'player.contact_change_applied': 'contact_change_applied',
  'player.profile_updated': 'player_updated',
  'player.password_set': 'player_updated',
}

const CONTACT_ACTIONS = [
  'player.contact_change_submitted',
  'player.contact_change_approved',
  'player.contact_change_rejected',
  'player.contact_change_applied',
]

type Metadata = Record<string, unknown>
const metadataOf = (value: unknown): Metadata =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Metadata) : {}
const str = (value: unknown) => (typeof value === 'string' ? value : null)

function priceLineOf(value: unknown): string | null {
  const price = metadataOf(value)
  if (price.pricing !== 'paid' && price.pricing !== 'free') return null
  return formatClubPriceLine({
    licensePricing: price.pricing,
    // A free price line names no amounts; a paid one always stores both.
    licenseMonthlyMinor: typeof price.monthlyMinor === 'number' ? price.monthlyMinor : 0,
    licenseYearlyMinor: typeof price.yearlyMinor === 'number' ? price.yearlyMinor : 0,
  })
}

/**
 * A-CLUB-DETAIL Activity and A-PLAYER-DETAIL Record of actions, newest first. Read-only: the log is
 * append-only and nothing here writes it. Summaries are rebuilt from the redacted metadata with the
 * mock's copy; an event whose summary can't be rebuilt from saved data is left out, never guessed.
 * Contact-change events are stored on the player with `metadata.requestId`; they are read per
 * request and never repeated on the player.
 */
export async function readAuditEvents(
  context: AdminContext,
  target: { targetType: AuditReadTarget; targetId: string },
): Promise<AuditEventDto[]> {
  requireAdmin(context)
  if (!UUID.test(target.targetId)) return []
  const where: Prisma.AdminAuditEventWhereInput =
    target.targetType === 'contact_change_request'
      ? {
          targetType: 'player',
          action: { in: CONTACT_ACTIONS },
          metadata: { path: ['requestId'], equals: target.targetId },
        }
      : target.targetType === 'player'
        ? { targetType: 'player', targetId: target.targetId, action: { notIn: CONTACT_ACTIONS } }
        : { targetType: 'club', targetId: target.targetId }
  const events = await prisma.adminAuditEvent.findMany({
    where,
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      action: true,
      targetId: true,
      occurredAt: true,
      metadata: true,
      actor: { select: { displayName: true } },
    },
  })
  const summarize = await summarizer(events)
  const emitted = new Set<string>()
  return events.flatMap((event) => {
    const action = UI_ACTION[event.action]
    const metadata = metadataOf(event.metadata)
    const operationId = str(metadata.operationId)
    if (operationId && emitted.has(operationId)) return []
    let summary = action ? summarize(event) : null
    if (operationId) {
      emitted.add(operationId)
      const parts = events.filter(
        (item) => str(metadataOf(item.metadata).operationId) === operationId,
      )
      const fields = [
        ...new Set(
          parts.flatMap((item) => {
            const changed = metadataOf(item.metadata).changed
            return Array.isArray(changed)
              ? changed.filter((field): field is string => typeof field === 'string')
              : []
          }),
        ),
      ]
      const named = parts
        .map((item) => metadataOf(item.metadata))
        .find((item) => str(metadataOf(item.after).name) || str(item.name))
      const name = named ? (str(metadataOf(named.after).name) ?? str(named.name)) : null
      const reason = parts.map((item) => str(metadataOf(item.metadata).reason)).find(Boolean)
      if (name && reason && fields.length)
        summary = `Edited ${name}: ${fields.join(', ')}. Reason: ${reason}`
    }
    if (!action || !summary) return []
    return [
      {
        id: event.id,
        action,
        targetType: target.targetType,
        targetId: target.targetType === 'contact_change_request' ? target.targetId : event.targetId,
        at: toIso(event.occurredAt),
        actor: event.actor.displayName,
        summary,
      },
    ]
  })
}

type ReadEvent = {
  id: string
  action: string
  targetId: string
  occurredAt: Date
  metadata: Prisma.JsonValue
}

/** Loads the current rows the summaries name (club, terms, name requests, players) in one pass. */
async function summarizer(events: ReadEvent[]) {
  const clubIds = [
    ...new Set(events.filter((e) => e.action.startsWith('club.')).map((e) => e.targetId)),
  ]
  const playerIds = [
    ...new Set(events.filter((e) => e.action.startsWith('player.')).map((e) => e.targetId)),
  ]
  const termIds = events.flatMap((e) => {
    const termId = e.action.startsWith('club.license_') ? str(metadataOf(e.metadata).termId) : null
    return termId && UUID.test(termId) ? [termId] : []
  })
  const [clubs, terms, rejectedNames, priceChanges, players] = await Promise.all([
    clubIds.length
      ? prisma.club.findMany({
          where: { id: { in: clubIds } },
          select: {
            id: true,
            licensePricing: true,
            licenseMonthlyMinor: true,
            licenseYearlyMinor: true,
            account: { select: { username: true } },
          },
        })
      : [],
    termIds.length
      ? prisma.clubLicenseTerm.findMany({
          where: { id: { in: termIds } },
          select: {
            id: true,
            plan: true,
            startsAt: true,
            endsAt: true,
            amountMinor: true,
            paymentReference: true,
          },
        })
      : [],
    events.some((e) => e.action === 'club.name_change_rejected')
      ? prisma.clubNameChangeRequest.findMany({
          where: { clubId: { in: clubIds }, state: 'rejected' },
          select: { clubId: true, requestedName: true, reviewedAt: true },
        })
      : [],
    // The price a club was created with is the `before` of its first price change, else today's.
    events.some((e) => e.action === 'club.created')
      ? prisma.adminAuditEvent.findMany({
          where: { targetType: 'club', targetId: { in: clubIds }, action: 'club.price_changed' },
          orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
          select: { targetId: true, metadata: true },
        })
      : [],
    playerIds.length
      ? prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, fullName: true },
        })
      : [],
  ])
  const clubById = new Map(clubs.map((club) => [club.id, club]))
  const termById = new Map(terms.map((term) => [term.id, term]))
  const nameOf = new Map(players.map((player) => [player.id, player.fullName]))
  const createdPrice = new Map<string, unknown>()
  for (const change of priceChanges)
    if (!createdPrice.has(change.targetId))
      createdPrice.set(change.targetId, metadataOf(change.metadata).before)

  return (event: ReadEvent): string | null => {
    const metadata = metadataOf(event.metadata)
    switch (event.action) {
      case 'club.created': {
        const club = clubById.get(event.targetId)
        if (!club?.account?.username) return null
        const price = createdPrice.has(club.id)
          ? priceLineOf(createdPrice.get(club.id))
          : formatClubPriceLine({
              licensePricing: club.licensePricing,
              licenseMonthlyMinor: club.licenseMonthlyMinor ?? 0,
              licenseYearlyMinor: club.licenseYearlyMinor ?? 0,
            })
        return price ? `Set up the club account ${club.account.username}. Price: ${price}.` : null
      }
      case 'club.price_changed': {
        const before = priceLineOf(metadata.before)
        const after = priceLineOf(metadata.after)
        return before && after ? `Changed price from ${before} to ${after}.` : null
      }
      case 'club.name_change_approved': {
        const before = str(metadata.before)
        const after = str(metadata.after)
        return before && after ? `Approved name change: ${before} → ${after}.` : null
      }
      case 'club.name_change_rejected': {
        const kept = str(metadata.before)
        // The event names no request: take the club's rejected request reviewed closest to it.
        const distance = (at: Date | null) =>
          at ? Math.abs(at.getTime() - event.occurredAt.getTime()) : Number.POSITIVE_INFINITY
        const request = rejectedNames
          .filter((entry) => entry.clubId === event.targetId && entry.reviewedAt)
          .sort((a, b) => distance(a.reviewedAt) - distance(b.reviewedAt))[0]
        return kept && request
          ? `Rejected name change to ${request.requestedName}. Kept ${kept}.`
          : null
      }
      case 'club.license_activated':
      case 'club.license_renewed': {
        const term = termById.get(str(metadata.termId) ?? '')
        if (!term) return null
        // The mock's retention note is not stored, so it is never shown here.
        return licenseAuditSummary(
          event.action === 'club.license_renewed' ? 'Renewed' : 'Activated',
          {
            plan: term.plan === 'yearly' ? 'Yearly' : 'Monthly',
            startsAt: manilaToday(term.startsAt),
            // `endsAt` is the exclusive end of access; the last licensed day is the day before.
            endsAt: manilaToday(new Date(term.endsAt.getTime() - 1)),
            amountMinor: term.amountMinor,
            paymentReference: term.paymentReference,
          },
        )
      }
      case 'player.contact_change_approved':
      case 'player.contact_change_rejected':
      case 'player.contact_change_applied': {
        const field =
          metadata.field === 'phone' || metadata.field === 'email' ? metadata.field : null
        const name = nameOf.get(event.targetId)
        if (!field || !name) return null
        const verb =
          event.action === 'player.contact_change_approved'
            ? 'Approved'
            : event.action === 'player.contact_change_rejected'
              ? 'Declined'
              : 'Applied'
        return `${verb} ${CONTACT_FIELD_WORD[field]} change for ${name}.`
      }
      case 'player.contact_change_submitted': {
        // Same copy as the mock's line (#564); the reason is stored, the contact never is.
        const name = nameOf.get(event.targetId)
        const reason = str(metadata.reason)
        if (metadata.field !== 'email' || !name || !reason) return null
        return `Email change for ${name} entered by ROTRA Admin. Reason: ${reason}`
      }
      case 'player.password_set': {
        const reason = str(metadata.reason)
        return reason ? `Password set by ROTRA Admin. Reason: ${reason}` : null
      }
      case 'player.profile_updated': {
        const fields = Array.isArray(metadata.changed)
          ? metadata.changed.filter((field): field is string => typeof field === 'string')
          : []
        const name = str(metadataOf(metadata.after).name)
        const editReason = str(metadata.reason)
        if (fields.length && name && editReason)
          return `Edited ${name}: ${fields.join(', ')}. Reason: ${editReason}`
        // The mock's line, from the stored name/nickname pair (a photo link is never saved here).
        const identity = (value: unknown) => {
          const side = metadataOf(value)
          const name = str(side.name)
          return name ? JSON.stringify({ name, nickname: str(side.nickname) }) : null
        }
        const before = identity(metadata.before)
        const after = identity(metadata.after)
        const reason = str(metadata.reason)
        return before && after && reason
          ? `Changed by ROTRA Admin: ${before} → ${after}. Reason: ${reason}`
          : null
      }
      default:
        return null
    }
  }
}
