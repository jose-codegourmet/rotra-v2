import { emailField } from '@rotra/schema/email'
import { formatPhoneForDisplay, phoneField } from '@rotra/schema/phone'
import {
  contactRequestCounts,
  isBlocked,
  matchesContactRequestFilter,
  nextActionLabel,
} from '../contact-change-request/contactChangeRequest.rules'
import type {
  AdminContactChangeSubmitted,
  AdminContactRequestDetail,
  AdminContactRequestList,
  ContactChangeField,
  ContactChangeRequest,
  ContactChangeSource,
  ContactChangeStatus,
  ContactCheck,
  ContactRequestCounts,
  ContactRequestListParams,
  ContactRequestPlayer,
  PlayerContactChangeRequest,
} from '../contact-change-request/contactChangeRequest.types'
import { MockError } from '../mock/errors'
import { RealRequestError, realRequest } from './client'

/** rotra-admin.html runApply() failure copy; kept here so the real adapter has no mock import. */
const PROVIDER_ERROR = "The sign-in provider didn't accept the change."
/** rotra-admin.html doApprove() copy, reused for a request that was decided elsewhere. */
const REVIEW_STALE_ERROR = 'Something changed while you were reviewing. Check the request again.'
const GONE_ERROR = 'That request no longer exists.'

/** Stored contacts are normalized (E.164 phone, lowercase email); the screens show phones grouped. */
const shown = (field: ContactChangeField, value: string) =>
  field === 'phone' && value ? formatPhoneForDisplay(value) : value

const msOrUndefined = (iso: string | null) => (iso ? Date.parse(iso) : undefined)

// ---------- Player: P-ACCOUNT, P-CONTACT-REQUEST ----------

/** `ownRequestDto`: approved, applying and failed all arrive as 'approved_pending' (services.md). */
type WireOwnRequest = {
  id: string
  playerId: string
  field: ContactChangeField
  originalValue: string | null
  proposedValue: string
  status: Exclude<ContactChangeStatus, 'approved' | 'applying' | 'failed'> | 'approved_pending'
  requestedAt: string
}

function ownOf(request: WireOwnRequest): ContactChangeRequest {
  return {
    requestId: request.id,
    playerId: request.playerId,
    field: request.field,
    fromValue: shown(request.field, request.originalValue ?? ''),
    toValue: shown(request.field, request.proposedValue),
    // The player sees "Approved, being set up" until it is applied; review detail stays Admin's.
    status: request.status === 'approved_pending' ? 'approved' : request.status,
    requestedAt: Date.parse(request.requestedAt),
  }
}

export async function realGetMyContactChangeRequest(
  signal?: AbortSignal,
): Promise<ContactChangeRequest | null> {
  try {
    const { request } = await realRequest<{ request: WireOwnRequest | null }>(
      '/api/account/contact-change',
      { signal },
    )
    return request ? ownOf(request) : null
  } catch (error) {
    // Signed out: like the mock, nobody's request is shown.
    if (error instanceof RealRequestError && error.status === 401) return null
    throw error
  }
}

/** Validates like the request form (prototype copy), then sends one pending request for review. */
export async function realSubmitContactChangeRequest(input: {
  field: ContactChangeField
  toValue: string
}): Promise<ContactChangeRequest> {
  const fieldError = (message: string) => new MockError('conflict', message, { toValue: message })
  let value: string
  if (input.field === 'phone') {
    const phone = phoneField.safeParse(input.toValue)
    if (!phone.success) throw fieldError('Enter a Philippine mobile number, like 0917 555 0142.')
    value = phone.data
  } else {
    const email = emailField.safeParse(input.toValue)
    if (!email.success) throw fieldError('Enter an email address, like name@example.com.')
    value = email.data.toLowerCase()
  }
  try {
    const { request } = await realRequest<{ request: WireOwnRequest }>(
      '/api/account/contact-change',
      {
        method: 'POST',
        body: { commandId: crypto.randomUUID(), field: input.field, value },
        fields: { value: 'toValue' },
      },
    )
    return ownOf(request)
  } catch (error) {
    if (!(error instanceof RealRequestError)) throw error
    if (error.fieldErrors?.request) throw new MockError('conflict', 'request-open')
    const onField = error.fieldErrors?.toValue
    if (onField) throw fieldError(onField)
    if (error.status === 401)
      throw new MockError('permission', 'Sign in to request a contact change.')
    throw error
  }
}

// ---------- Admin: A-CONTACT-REQUESTS, A-CONTACT-REVIEW, D-CONTACT ----------

/** `readAdminContactChangeRequests`: no provider operation ref, attempts, reviewer or note. */
type WireAdminRequest = {
  requestId: string
  playerId: string
  field: ContactChangeField
  fromValue: string
  toValue: string
  status: ContactChangeStatus
  source: ContactChangeSource
  requestedAt: string
  approvedAt: string | null
  appliedAt: string | null
  decidedAt: string | null
  failureCode: string | null
  player: ContactRequestPlayer
  checks: ContactCheck[] | null
}

function detailOf(wire: WireAdminRequest): AdminContactRequestDetail {
  const request: PlayerContactChangeRequest = {
    requestId: wire.requestId,
    playerId: wire.playerId,
    field: wire.field,
    fromValue: shown(wire.field, wire.fromValue),
    toValue: shown(wire.field, wire.toValue),
    status: wire.status,
    requestedAt: Date.parse(wire.requestedAt),
    source: wire.source,
    approvedAt: msOrUndefined(wire.approvedAt),
    appliedAt: msOrUndefined(wire.appliedAt),
    decidedAt: msOrUndefined(wire.decidedAt),
    // Every stored failure code is an application failure; the code itself is not shown.
    error: wire.status === 'failed' ? PROVIDER_ERROR : undefined,
    // The database keeps a contact revision server-side; the client only needs the original value.
    originalContactRevision: wire.fromValue,
    providerOperationRef: null,
  }
  const blocked = wire.checks ? isBlocked(wire.status, wire.checks) : false
  return {
    ...request,
    player: wire.player,
    blocked,
    nextAction: nextActionLabel(wire.status, blocked),
    checks: wire.checks,
  }
}

async function allRequests(signal?: AbortSignal) {
  const { requests } = await realRequest<{ requests: WireAdminRequest[] }>(
    '/api/contact-change-requests',
    { signal },
  )
  return requests.map(detailOf)
}

/** Same list rules as the mock: player scope, then counts over the scope, then the status filter. */
export async function realListContactRequests(
  params: ContactRequestListParams,
  signal?: AbortSignal,
): Promise<AdminContactRequestList> {
  const scoped = (await allRequests(signal)).filter(
    (request) => !params.playerId || request.playerId === params.playerId,
  )
  const rows = scoped
    .filter((request) => matchesContactRequestFilter(request.status, params.status))
    .sort((a, b) => b.requestedAt - a.requestedAt)
    .map(({ checks: _checks, ...row }) => row)
  return { rows, counts: contactRequestCounts(scoped) }
}

export async function realGetContactRequestCounts(
  signal?: AbortSignal,
): Promise<ContactRequestCounts> {
  return contactRequestCounts(await allRequests(signal))
}

export async function realGetContactRequest(
  requestId: string,
  signal?: AbortSignal,
): Promise<AdminContactRequestDetail | null> {
  try {
    const { request } = await realRequest<{ request: WireAdminRequest }>(
      `/api/contact-change-requests/${encodeURIComponent(requestId)}`,
      { signal },
    )
    return detailOf(request)
  } catch (error) {
    if (error instanceof RealRequestError && error.status === 404) return null
    throw error
  }
}

/** Decline: changes no contact. A request already decided another way is a stale review. */
export async function realDeclineContactChange(
  requestId: string,
): Promise<PlayerContactChangeRequest> {
  let declined: AdminContactRequestDetail
  try {
    const { request } = await realRequest<{ request: WireAdminRequest }>(
      `/api/contact-change-requests/${encodeURIComponent(requestId)}/decline`,
      { method: 'POST' },
    )
    declined = detailOf(request)
  } catch (error) {
    if (error instanceof RealRequestError && error.status === 409)
      throw new MockError('conflict', REVIEW_STALE_ERROR)
    if (error instanceof RealRequestError && error.status === 404)
      throw new MockError('permission', GONE_ERROR)
    throw error
  }
  if (declined.status !== 'rejected') throw new MockError('conflict', REVIEW_STALE_ERROR)
  return declined
}

/**
 * Approve, Retry application and Check status share one shape: the route returns the request as
 * it now stands. A conflict (decided elsewhere, contacts changed, value taken) is a stale review.
 */
async function sendApplication(requestId: string, action: 'approve' | 'retry' | 'check') {
  try {
    const { request } = await realRequest<{ request: WireAdminRequest }>(
      `/api/contact-change-requests/${encodeURIComponent(requestId)}/${action}`,
      { method: 'POST' },
    )
    return detailOf(request)
  } catch (error) {
    if (error instanceof RealRequestError && error.status === 409)
      throw new MockError('conflict', REVIEW_STALE_ERROR)
    throw error
  }
}

const gone = (error: unknown) => error instanceof RealRequestError && error.status === 404

/**
 * Approve change: reviewed and applied at the sign-in provider in one request. A saved approval
 * comes back applied, applying or failed (Retry application), never as an error.
 */
export async function realApproveContactChange(
  requestId: string,
): Promise<PlayerContactChangeRequest> {
  let approved: AdminContactRequestDetail
  try {
    approved = await sendApplication(requestId, 'approve')
  } catch (error) {
    if (gone(error)) throw new MockError('permission', GONE_ERROR)
    throw error
  }
  if (approved.status === 'pending' || approved.status === 'rejected')
    throw new MockError('conflict', REVIEW_STALE_ERROR)
  return approved
}

/** Retry application: the same request and provider operation, never a new one. */
export async function realRetryContactApplication(
  requestId: string,
): Promise<PlayerContactChangeRequest> {
  try {
    return await sendApplication(requestId, 'retry')
  } catch (error) {
    if (gone(error)) throw new MockError('permission', GONE_ERROR)
    throw error
  }
}

/** Check status: the provider is read back and the request returned as it stands; null = gone. */
export async function realCheckContactApplication(
  requestId: string,
): Promise<AdminContactRequestDetail | null> {
  try {
    return await sendApplication(requestId, 'check')
  } catch (error) {
    if (gone(error)) return null
    throw error
  }
}

/** `adminRequestDto`: only the fields the Edit profile flow needs after sending. */
type WireSubmitted = { id: string; rawStatus: ContactChangeStatus }

/** Shared with the mock so both modes say the same thing. */
export const ADMIN_REQUEST_OPEN_ERROR =
  'This player has an open contact-change request. Review it on the Contact tab.'

/** No private-contact row yet: the service answers not found (packages/db submit()). */
const NO_CONTACT_RECORD = 'This player has no contact record yet.'

/**
 * Sends the owner's email for one player as a pending request. Field problems come back keyed
 * `email` (the form field); an open request is a conflict pointing to the Contact tab.
 */
export async function realSubmitAdminContactChange(input: {
  playerId: string
  field: 'email'
  toValue: string
  reason: string
  commandId: string
}): Promise<AdminContactChangeSubmitted> {
  try {
    const { request } = await realRequest<{ request: WireSubmitted }>(
      '/api/contact-change-requests',
      {
        method: 'POST',
        body: {
          commandId: input.commandId,
          playerId: input.playerId,
          field: input.field,
          value: input.toValue.trim().toLowerCase(),
          reason: input.reason,
        },
        fields: { value: 'email' },
      },
    )
    return { requestId: request.id, status: request.rawStatus }
  } catch (error) {
    if (!(error instanceof RealRequestError)) throw error
    if (error.fieldErrors?.request)
      throw new MockError('conflict', ADMIN_REQUEST_OPEN_ERROR, { email: ADMIN_REQUEST_OPEN_ERROR })
    if (error.status === 404)
      throw new MockError('conflict', NO_CONTACT_RECORD, { email: NO_CONTACT_RECORD })
    const onField = error.fieldErrors?.email
    if (onField) throw new MockError('conflict', onField, { email: onField })
    throw error
  }
}
