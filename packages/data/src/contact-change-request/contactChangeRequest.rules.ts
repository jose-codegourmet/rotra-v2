import { formatPhoneForDisplay, phoneField } from '@rotra/schema/phone'
import type {
  ContactChangeField,
  ContactChangeRequest,
  ContactChangeStatus,
  ContactCheck,
  ContactCheckPlayer,
  ContactRequestCounts,
  ContactRequestFilter,
  ContactRequestNextAction,
} from './contactChangeRequest.types'

/** rotra-admin.html FIELD: the word for a field inside a sentence. */
export const CONTACT_FIELD_WORD: Record<ContactChangeField, string> = {
  phone: 'phone number',
  email: 'email',
}

/** A player identity with the contacts it signs in with now (applied only; any phone format). */
export type ContactHolder = ContactCheckPlayer & { phone?: string; email?: string }

type CheckedRequest = Pick<
  ContactChangeRequest,
  'requestId' | 'playerId' | 'field' | 'fromValue' | 'toValue' | 'status' | 'requestedAt'
>

/** Approved but not applied yet: the provider operation may still be running. */
const IN_FLIGHT: readonly ContactChangeStatus[] = ['approved', 'applying']

/** Phones compare as E.164 whatever their display form; emails ignore case. '' = not set. */
export function normalizeContact(field: ContactChangeField, value: string | undefined): string {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return ''
  if (field === 'email') return trimmed.toLowerCase()
  const phone = phoneField.safeParse(trimmed)
  return phone.success ? phone.data : trimmed.replace(/[ -]/g, '')
}

/**
 * The four pre-approval checks, in the order ContactChecksList shows them (rotra-admin.html checks()):
 * the requested contact isn't another player's, no newer open request for the same field, the current
 * contact still matches the request, and no other change for this player is being applied.
 */
export function checksFor(
  request: CheckedRequest,
  holders: readonly ContactHolder[],
  requests: readonly CheckedRequest[],
): ContactCheck[] {
  const { field } = request
  const wanted = normalizeContact(field, request.toValue)
  const other = holders.find(
    (holder) => holder.id !== request.playerId && normalizeContact(field, holder[field]) === wanted,
  )
  const newer = requests
    .filter(
      (entry) =>
        entry.requestId !== request.requestId &&
        entry.playerId === request.playerId &&
        entry.field === field &&
        entry.requestedAt > request.requestedAt &&
        (entry.status === 'pending' || IN_FLIGHT.includes(entry.status)),
    )
    .sort((a, b) => b.requestedAt - a.requestedAt)[0]
  const current = holders.find((holder) => holder.id === request.playerId)?.[field] ?? ''
  const unchanged = normalizeContact(field, current) === normalizeContact(field, request.fromValue)
  const busy = requests.some(
    (entry) =>
      entry.requestId !== request.requestId &&
      entry.playerId === request.playerId &&
      IN_FLIGHT.includes(entry.status),
  )
  return [
    other
      ? {
          kind: 'linked-elsewhere',
          ok: false,
          otherPlayer: { id: other.id, fullName: other.fullName, rtrId: other.rtrId },
        }
      : { kind: 'linked-elsewhere', ok: true },
    newer
      ? {
          kind: 'newer-request',
          ok: false,
          newerRequestId: newer.requestId,
          sentAt: newer.requestedAt,
        }
      : { kind: 'newer-request', ok: true },
    unchanged
      ? { kind: 'original-changed', ok: true }
      : {
          kind: 'original-changed',
          ok: false,
          currentValue: field === 'phone' && current ? formatPhoneForDisplay(current) : current,
        },
    { kind: 'in-progress', ok: !busy },
  ]
}

/** Only a request waiting for review can be blocked; Approve stays off until every check passes. */
export function isBlocked(status: ContactChangeStatus, checks: readonly ContactCheck[]): boolean {
  return status === 'pending' && checks.some((check) => !check.ok)
}

/** rotra-admin.html nextAction(). */
export function nextActionLabel(
  status: ContactChangeStatus,
  blocked: boolean,
): ContactRequestNextAction {
  if (status === 'pending') return blocked ? 'Review · blocked' : 'Review'
  if (IN_FLIGHT.includes(status)) return 'Check status'
  if (status === 'failed') return 'Retry application'
  return 'View'
}

export function matchesContactRequestFilter(
  status: ContactChangeStatus,
  filter: ContactRequestFilter = 'all',
): boolean {
  if (filter === 'all') return true
  if (filter === 'applying') return IN_FLIGHT.includes(status)
  return status === filter
}

/** Waiting for review + needs attention (rotra-admin.html attentionContacts()). */
export function attentionCount(requests: readonly Pick<ContactChangeRequest, 'status'>[]): number {
  return requests.filter((request) => request.status === 'pending' || request.status === 'failed')
    .length
}

export function contactRequestCounts(
  requests: readonly Pick<ContactChangeRequest, 'status'>[],
): ContactRequestCounts {
  const count = (filter: ContactRequestFilter) =>
    requests.filter((request) => matchesContactRequestFilter(request.status, filter)).length
  return {
    pending: count('pending'),
    applying: count('applying'),
    failed: count('failed'),
    applied: count('applied'),
    rejected: count('rejected'),
    all: requests.length,
    attention: attentionCount(requests),
  }
}
