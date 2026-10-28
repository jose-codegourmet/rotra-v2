import { emailField } from '@rotra/schema/email'
import { formatPhoneForDisplay, phoneField } from '@rotra/schema/phone'
import { getSession } from '../auth/fetchers'
import { playerRequest } from '../leaderboard/request'
import { getMockDevState } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import {
  type ContactChangeField,
  type ContactChangeRequest,
  type ContactChangeStatus,
  OPEN_CONTACT_CHANGE_STATUSES,
} from './contactChangeRequest.types'

const FIELD_WORD: Record<ContactChangeField, string> = { phone: 'phone number', email: 'email' }

/** The signed-in player's latest request, or null. Never returned to anyone else. */
export async function getMyContactChangeRequest(
  signal?: AbortSignal,
): Promise<ContactChangeRequest | null> {
  await playerRequest(signal)
  const session = await getSession('player')
  if (!session) return null
  const mine = readMockState().contactChangeRequests.filter(
    (request) => request.playerId === session.account.id,
  )
  return mine.at(-1) ?? null
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
  const word = FIELD_WORD[field]
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
  let created: ContactChangeRequest | undefined
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
    if (input.to === 'applied') {
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
