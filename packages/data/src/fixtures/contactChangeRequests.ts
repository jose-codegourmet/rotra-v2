import type { ContactChangeRequest } from '../contact-change-request/contactChangeRequest.types'
import { PLAYER_FIXTURE_NOW } from './playerGames'

// Starts empty, as the prototype does: Jose sends a request from Privacy and contact.
export const contactChangeRequests: ContactChangeRequest[] = []

/**
 * Story-only Current → Requested values for the Admin contact review compare, on Jose's account
 * (rotra-admin.html `.change` with `.mono` values). An empty `from` shows as "Not set".
 */
export const contactChangeExamples = {
  email: { from: 'jose@example.com', to: 'jose.lahug.smash.club@example.com' },
  phone: { from: '+63 917 555 0142', to: '+63 917 555 0990' },
  notSet: { from: '', to: 'jose@example.com' },
}

/**
 * IDs of rotra-admin.html's decided contact requests r7 (Rafa, failed), r8 (Bea, applied) and r9
 * (Iya, rejected). The Admin audit fixture names them now; A03.6's request fixtures reuse them.
 */
export const contactRequestFixtureIds = {
  r7: 'contact-request-r7',
  r8: 'contact-request-r8',
  r9: 'contact-request-r9',
}

const HOUR = 60 * 60 * 1000
const KARL_ID = 'd720c601-da89-5474-9351-00e2fb966e56'
const JOSE_ID = '2c7f6a7b-eed9-5051-9426-6dbce5133fbc'
const at = (hoursAgo: number) => PLAYER_FIXTURE_NOW.getTime() - hoursAgo * HOUR

/**
 * Story-only rows for the Admin player detail's Contact-change requests list, relative to `now`.
 * `twoEmails` is the prototype's r3/r4 (Paulo Garcia's two email requests) on Karl, who holds
 * Paulo's RTR ID in the demo pool; the older one is blocked by the newer. `oneOfEach` shows every
 * status on Jose's account. Never in the mock store; A03.6 owns the Admin request fixtures.
 */
export const adminContactRequestExamples = {
  now: PLAYER_FIXTURE_NOW,
  twoEmails: [
    {
      requestId: 'story-contact-request-r4',
      playerId: KARL_ID,
      field: 'email',
      fromValue: 'karl@example.com',
      toValue: 'karl.dvo@example.com',
      status: 'pending',
      requestedAt: at(22),
    },
    {
      requestId: 'story-contact-request-r3',
      playerId: KARL_ID,
      field: 'email',
      fromValue: 'karl@example.com',
      toValue: 'karl.matina@example.com',
      status: 'pending',
      requestedAt: at(72),
    },
  ],
  oneOfEach: (
    [
      ['pending', 'phone', 2],
      ['applying', 'email', 26],
      ['failed', 'phone', 30],
      ['applied', 'email', 72],
      ['rejected', 'phone', 120],
    ] as const
  ).map(([status, field, hoursAgo]) => ({
    requestId: `story-contact-request-${status}`,
    playerId: JOSE_ID,
    field,
    fromValue: contactChangeExamples[field].from,
    toValue: contactChangeExamples[field].to,
    status,
    requestedAt: at(hoursAgo),
  })),
} satisfies { now: Date; twoEmails: ContactChangeRequest[]; oneOfEach: ContactChangeRequest[] }
