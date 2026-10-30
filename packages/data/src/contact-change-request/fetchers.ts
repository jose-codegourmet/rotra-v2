import { emailField } from '@rotra/schema/email'
import { formatPhoneForDisplay, phoneField } from '@rotra/schema/phone'
import { isAdminOffline } from '../admin-account/connectivity'
import { adminMutation } from '../admin-account/mutation'
import { appendAdminAudit } from '../admin-audit/fetchers'
import { getSession } from '../auth/fetchers'
import { playerRequest } from '../leaderboard/request'
import { consumeMockDevToggle, getMockDevState } from '../mock/bridge'
import { isProductionBuild } from '../mock/env'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, mockStore, readMockState } from '../mock/store'
import {
  CONTACT_FIELD_WORD,
  type ContactHolder,
  checksFor,
  contactRequestCounts,
  isBlocked,
  matchesContactRequestFilter,
  nextActionLabel,
  normalizeContact,
} from './contactChangeRequest.rules'
import {
  type AdminContactRequestDetail,
  type AdminContactRequestItem,
  type AdminContactRequestList,
  type ContactChangeField,
  type ContactChangeRequest,
  type ContactChangeStatus,
  type ContactRequestCounts,
  type ContactRequestListParams,
  type ContactRequestPlayer,
  OPEN_CONTACT_CHANGE_STATUSES,
  type PlayerContactChangeRequest,
} from './contactChangeRequest.types'

/** The signed-in player's latest request, or null. Never returned to anyone else. */
export async function getMyContactChangeRequest(
  signal?: AbortSignal,
): Promise<ContactChangeRequest | null> {
  await playerRequest(signal)
  const session = await getSession('player')
  if (!session) return null
  // Latest by time sent: the store also holds seeded Admin requests, not only this visit's.
  const latest = readMockState()
    .contactChangeRequests.filter((request) => request.playerId === session.account.id)
    .sort((a, b) => a.requestedAt - b.requestedAt)
    .at(-1)
  if (!latest) return null
  // The player's view only: no Admin review fields (provider reference, error detail).
  const { requestId, playerId, field, fromValue, toValue, status, requestedAt } = latest
  return { requestId, playerId, field, fromValue, toValue, status, requestedAt }
}

/**
 * Sends a request for Admin review. Validates like the request form, stores phones in display form
 * ('+63 9XX XXX XXXX'), and never changes the login contact: only Finish applying does.
 */
export async function submitContactChangeRequest(input: {
  field: ContactChangeField
  toValue: string
}): Promise<ContactChangeRequest> {
  await delay(800)
  if (getMockDevState().offline)
    throw new MockError(
      'offline',
      "Couldn't send because you're offline. Try again when you're connected.",
    )
  const session = await getSession('player')
  if (!session) throw new MockError('permission', 'Sign in to request a contact change.')
  const { field } = input
  const word = CONTACT_FIELD_WORD[field]
  const fieldError = (message: string) => new MockError('conflict', message, { toValue: message })
  let normalized: string
  if (field === 'phone') {
    const phone = phoneField.safeParse(input.toValue)
    if (!phone.success) throw fieldError('Enter a Philippine mobile number, like 0917 555 0142.')
    normalized = phone.data
  } else {
    const email = emailField.safeParse(input.toValue)
    if (!email.success) throw fieldError('Enter an email address, like name@example.com.')
    normalized = email.data.toLowerCase()
  }
  let created: PlayerContactChangeRequest | undefined
  mockStore.update((draft) => {
    const account = draft.playerAccounts.find((a) => a.playerId === session.account.id)
    if (!account) throw new MockError('permission', 'Sign in to request a contact change.')
    const current = field === 'phone' ? account.phone : account.email.toLowerCase()
    if (normalized === current) throw fieldError(`That's already your ${word}.`)
    const taken = draft.playerAccounts.some(
      (other) =>
        other.playerId !== account.playerId &&
        (field === 'phone' ? other.phone === normalized : other.email.toLowerCase() === normalized),
    )
    if (taken)
      throw fieldError(`That ${word} belongs to another ROTRA profile. Contact ROTRA for help.`)
    const open = draft.contactChangeRequests.some(
      (request) =>
        request.playerId === account.playerId &&
        OPEN_CONTACT_CHANGE_STATUSES.includes(request.status),
    )
    if (open) throw new MockError('conflict', 'request-open')
    created = {
      requestId: `ccr-${Date.now().toString(36)}`,
      playerId: account.playerId,
      field,
      fromValue: field === 'phone' ? formatPhoneForDisplay(account.phone) : account.email,
      toValue: field === 'phone' ? formatPhoneForDisplay(normalized) : normalized,
      status: 'pending',
      requestedAt: Date.now(),
      source: 'app',
      originalContactRevision: current,
      providerOperationRef: null,
    }
    draft.contactChangeRequests.push(created)
  })
  if (!created) throw new Error('Contact-change request produced no result.')
  return created
}

/** Admin-side transitions the DevMenu drives: each status may only move to the next ones. */
const NEXT: Partial<Record<ContactChangeStatus, ContactChangeStatus[]>> = {
  pending: ['applying', 'rejected'],
  approved: ['applying'],
  applying: ['applied', 'failed'],
  failed: ['applied'],
}

/**
 * DevMenu › Contact-change request (Admin). Only 'applied' writes the new phone or email to the
 * account; the RTR ID and history never change.
 */
export async function advanceContactChangeRequest(input: {
  requestId: string
  to: ContactChangeStatus
}): Promise<ContactChangeRequest> {
  await delay(200)
  let advanced: ContactChangeRequest | undefined
  mockStore.update((draft) => {
    const request = draft.contactChangeRequests.find((r) => r.requestId === input.requestId)
    if (!request) throw new MockError('permission', 'That request no longer exists.')
    if (!NEXT[request.status]?.includes(input.to))
      throw new MockError('conflict', `A ${request.status} request can't become ${input.to}.`)
    request.status = input.to
    const now = Date.now()
    if (input.to === 'applying') {
      request.approvedAt ??= now
      request.providerOperationRef ??= `provider-op-${request.requestId}`
    }
    if (input.to === 'rejected') request.decidedAt = now
    if (input.to === 'failed') request.error = "The sign-in provider didn't accept the change."
    if (input.to === 'applied') {
      request.appliedAt = now
      request.error = undefined
      const account = draft.playerAccounts.find((a) => a.playerId === request.playerId)
      if (!account) throw new MockError('permission', 'The account no longer exists.')
      if (request.field === 'phone') account.phone = phoneField.parse(request.toValue)
      else account.email = request.toValue
    }
    advanced = structuredClone(request)
  })
  if (!advanced) throw new Error('Contact-change request update produced no result.')
  return advanced
}

// ---------- Admin: A-CONTACT-REQUESTS, A-CONTACT-REVIEW, D-CONTACT ----------

/** rotra-admin.html runApply() failure copy (dev toggle 'Next contact change fails to apply'). */
export const CONTACT_PROVIDER_ERROR = "The sign-in provider didn't accept the change."
/** rotra-admin.html doApprove(): the checks failed again when the approval was committed. */
export const CONTACT_REVIEW_STALE_ERROR =
  'Something changed while you were reviewing. Check the request again.'
/** rotra-admin.html checkApply() while offline. */
export const CONTACT_CHECK_OFFLINE_ERROR = "You're offline. Check the status once you're connected."
/** Approve to applied, and Check status (rotra-admin.html runApply(id, 1800) / (id, 900)). */
const APPLY_MS = 1800
const CHECK_MS = 900

/** Only players with an account have contacts to sign in with (fixtures/playerAccounts.ts). */
function contactHoldersOf(state: MockState): ContactHolder[] {
  return state.playerAccounts.flatMap((account) => {
    const player = state.players.find((entry) => entry.id === account.playerId)
    return player
      ? [
          {
            id: player.id,
            fullName: player.fullName,
            rtrId: player.rtrId,
            phone: account.phone,
            email: account.email,
          },
        ]
      : []
  })
}

function requestPlayerOf(state: MockState, playerId: string): ContactRequestPlayer {
  const player = state.players.find((entry) => entry.id === playerId)
  if (!player) throw new Error('A contact-change request references a missing player.')
  const account = state.playerAccounts.find((entry) => entry.playerId === playerId)
  return {
    id: player.id,
    fullName: player.fullName,
    rtrId: player.rtrId,
    nickname:
      player.nickname ??
      state.clubPlayers.find((entry) => entry.playerId === playerId && entry.nickname)?.nickname ??
      null,
    // A request needs a sign-in account, so its player is registered.
    claimed: Boolean(account),
    phone: account?.phone,
    email: account?.email,
  }
}

function checksIn(state: MockState, request: PlayerContactChangeRequest) {
  return checksFor(request, contactHoldersOf(state), state.contactChangeRequests)
}

/** Checks exist only while a request waits for review. */
function pendingChecksOf(state: MockState, request: PlayerContactChangeRequest) {
  return request.status === 'pending' ? checksIn(state, request) : null
}

function itemOf(
  state: MockState,
  request: PlayerContactChangeRequest,
  checks = pendingChecksOf(state, request),
): AdminContactRequestItem {
  const blocked = checks ? isBlocked(request.status, checks) : false
  return {
    ...structuredClone(request),
    player: requestPlayerOf(state, request.playerId),
    blocked,
    nextAction: nextActionLabel(request.status, blocked),
  }
}

function detailOf(
  state: MockState,
  request: PlayerContactChangeRequest,
): AdminContactRequestDetail {
  const checks = pendingChecksOf(state, request)
  return { ...itemOf(state, request, checks), checks }
}

/**
 * A-CONTACT-REQUESTS (and a player's requests on A-PLAYER-DETAIL): newest first, with counts per
 * status over the same player scope. Swap this implementation for the real transport later.
 */
export async function listContactRequests(
  params: ContactRequestListParams = {},
  signal?: AbortSignal,
): Promise<AdminContactRequestList> {
  await delay(400, signal)
  const state = readMockState()
  const scoped = state.contactChangeRequests.filter(
    (request) => !params.playerId || request.playerId === params.playerId,
  )
  const rows = scoped
    .filter((request) => matchesContactRequestFilter(request.status, params.status))
    .sort((a, b) => b.requestedAt - a.requestedAt)
    .map((request) => itemOf(state, request))
  return { rows, counts: contactRequestCounts(scoped) }
}

/** Whole-queue counts for the Admin nav (`attention`) and the status filter. */
export async function getContactRequestCounts(signal?: AbortSignal): Promise<ContactRequestCounts> {
  await delay(400, signal)
  return contactRequestCounts(readMockState().contactChangeRequests)
}

/** A-CONTACT-REVIEW; null = not found. Checks (with the newer-request link) only while pending. */
export async function getContactRequest(
  requestId: string,
  signal?: AbortSignal,
): Promise<AdminContactRequestDetail | null> {
  await delay(400, signal)
  const state = readMockState()
  const request = state.contactChangeRequests.find((entry) => entry.requestId === requestId)
  return request ? detailOf(state, request) : null
}

function findRequest(draft: MockState, requestId: string) {
  const request = draft.contactChangeRequests.find((entry) => entry.requestId === requestId)
  if (!request) throw new MockError('permission', 'That request no longer exists.')
  return request
}

function playerNameIn(draft: MockState, playerId: string) {
  return draft.players.find((entry) => entry.id === playerId)?.fullName ?? 'this player'
}

/**
 * The sign-in provider's answer for an approved change. The account changes only here, only when
 * the provider accepts; the RTR ID, player ID and history never change. Never overwrites another
 * player's contact or a contact that changed after the request (a stale retry), and does nothing
 * unless the request is still being applied (so a late timer after Check status is harmless).
 */
function settleApplication(requestId: string, generation: number) {
  if (mockStore.getGeneration() !== generation) return
  const before = readMockState().contactChangeRequests.find(
    (entry) => entry.requestId === requestId,
  )
  if (!before || (before.status !== 'applying' && before.status !== 'approved')) return
  const providerFails =
    !isProductionBuild() && consumeMockDevToggle('adminNextContactApplicationFails')
  mockStore.update((draft) => {
    const request = draft.contactChangeRequests.find((entry) => entry.requestId === requestId)
    if (!request || (request.status !== 'applying' && request.status !== 'approved')) return
    const word = CONTACT_FIELD_WORD[request.field]
    const name = playerNameIn(draft, request.playerId)
    const account = draft.playerAccounts.find((entry) => entry.playerId === request.playerId)
    const wanted = normalizeContact(request.field, request.toValue)
    // Defensive: approval blocks both, but the provider is the last line against duplicates.
    const takenByOther = draft.playerAccounts.some(
      (entry) =>
        entry.playerId !== request.playerId &&
        normalizeContact(request.field, entry[request.field]) === wanted,
    )
    const stale =
      !account ||
      normalizeContact(request.field, account[request.field]) !== request.originalContactRevision
    if (providerFails || takenByOther || stale || !account) {
      // Only a stale contact isn't the provider's refusal. Its copy is rotra-admin.html checks()'
      // 'original changed' line; the prototype has no failure text for it.
      const staleOnly = stale && !providerFails && !takenByOther
      request.status = 'failed'
      request.error = staleOnly
        ? `Their ${word} has changed since this was sent.`
        : CONTACT_PROVIDER_ERROR
      appendAdminAudit(draft, {
        action: 'contact_change_application_failed',
        targetType: 'contact_change_request',
        targetId: request.requestId,
        summary: staleOnly
          ? `Applying ${word} change for ${name} failed. ${request.error}`
          : `Applying ${word} change for ${name} failed at the sign-in provider.`,
      })
      return
    }
    if (request.field === 'phone') account.phone = wanted
    else account.email = wanted
    request.status = 'applied'
    request.appliedAt = Date.now()
    request.error = undefined
    appendAdminAudit(draft, {
      action: 'contact_change_applied',
      targetType: 'contact_change_request',
      targetId: request.requestId,
      summary: `Applied ${word} change for ${name}.`,
    })
  })
}

/** Stands in for the provider's asynchronous reply; a demo reset in between cancels it. */
function scheduleApplication(requestId: string) {
  const generation = mockStore.getGeneration()
  setTimeout(() => settleApplication(requestId, generation), APPLY_MS)
}

/**
 * D-CONTACT › Approve change. Rechecks at commit; approval only starts applying (status 'applying'),
 * and the player's contact changes when the provider accepts it ~1.8 s later.
 */
export async function approveContactChange(requestId: string): Promise<PlayerContactChangeRequest> {
  const approved = await adminMutation(900, (draft) => {
    const request = findRequest(draft, requestId)
    if (request.status !== 'pending' || isBlocked(request.status, checksIn(draft, request)))
      throw new MockError('conflict', CONTACT_REVIEW_STALE_ERROR)
    request.status = 'applying'
    request.approvedAt = Date.now()
    request.providerOperationRef = `provider-op-${crypto.randomUUID()}`
    appendAdminAudit(draft, {
      action: 'contact_change_approved',
      targetType: 'contact_change_request',
      targetId: request.requestId,
      summary: `Approved ${CONTACT_FIELD_WORD[request.field]} change for ${playerNameIn(draft, request.playerId)}.`,
    })
    return structuredClone(request)
  })
  scheduleApplication(requestId)
  return approved
}

/** Decline: the player keeps the current contact and can send a new request. */
export async function declineContactChange(requestId: string): Promise<PlayerContactChangeRequest> {
  return adminMutation(800, (draft) => {
    const request = findRequest(draft, requestId)
    if (request.status !== 'pending') throw new MockError('conflict', CONTACT_REVIEW_STALE_ERROR)
    request.status = 'rejected'
    request.decidedAt = Date.now()
    appendAdminAudit(draft, {
      action: 'contact_change_declined',
      targetType: 'contact_change_request',
      targetId: request.requestId,
      summary: `Declined ${CONTACT_FIELD_WORD[request.field]} change for ${playerNameIn(draft, request.playerId)}.`,
    })
    return structuredClone(request)
  })
}

/**
 * Retry application: the same approved request and providerOperationRef go back to applying, so a
 * retry never creates a new identity or request.
 */
export async function retryContactApplication(
  requestId: string,
): Promise<PlayerContactChangeRequest> {
  const retried = await adminMutation(400, (draft) => {
    const request = findRequest(draft, requestId)
    if (request.status !== 'failed') throw new MockError('conflict', CONTACT_REVIEW_STALE_ERROR)
    request.status = 'applying'
    request.error = undefined
    request.providerOperationRef ??= `provider-op-${crypto.randomUUID()}`
    appendAdminAudit(draft, {
      action: 'contact_change_application_retried',
      targetType: 'contact_change_request',
      targetId: request.requestId,
      summary: `Retried applying ${CONTACT_FIELD_WORD[request.field]} change for ${playerNameIn(draft, request.playerId)}.`,
    })
    return structuredClone(request)
  })
  scheduleApplication(requestId)
  return retried
}

/**
 * Check status: asks the provider again (~0.9 s) and returns the request as it now stands; an
 * application still running settles here. null = not found.
 */
export async function checkContactApplication(
  requestId: string,
): Promise<AdminContactRequestDetail | null> {
  if (isAdminOffline()) throw new MockError('offline', CONTACT_CHECK_OFFLINE_ERROR)
  await delay(CHECK_MS)
  if (isAdminOffline()) throw new MockError('offline', CONTACT_CHECK_OFFLINE_ERROR)
  settleApplication(requestId, mockStore.getGeneration())
  const state = readMockState()
  const request = state.contactChangeRequests.find((entry) => entry.requestId === requestId)
  return request ? detailOf(state, request) : null
}
