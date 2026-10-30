import type {
  AdminContactChangeRequest,
  ContactChangeRequest,
} from '../contact-change-request/contactChangeRequest.types'
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

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const KARL_ID = 'd720c601-da89-5474-9351-00e2fb966e56'
const JOSE_ID = '2c7f6a7b-eed9-5051-9426-6dbce5133fbc'
const RAYMARK_ID = 'bc4c3446-0131-591b-ab03-af19225dbe8a'
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

/**
 * Story-only requests for the Admin contact review (rotra-admin.html seedRequests r1, r5–r9), one per
 * status plus an owner-entered one, relative to `now`. Jose stands in for the prototype's Miguel
 * Santos (r1's values are his real phone) and Raymark for the other players; current values match
 * their accounts. Never in the mock store; A03.6 owns the Admin request fixtures.
 */
export const adminContactReviewExamples = {
  now: PLAYER_FIXTURE_NOW,
  /** r1 */
  pending: {
    requestId: 'story-contact-request-r1',
    playerId: JOSE_ID,
    field: 'phone',
    fromValue: '+63 917 555 0142',
    toValue: '+63 927 555 0198',
    status: 'pending',
    requestedAt: at(2),
    source: 'app',
  },
  /** r5: the player contacted the owner, who entered the request */
  fromOwner: {
    requestId: 'story-contact-request-r5',
    playerId: RAYMARK_ID,
    field: 'email',
    fromValue: 'raymark@example.com',
    toValue: 'raymark.smash@example.com',
    status: 'pending',
    requestedAt: at(26),
    source: 'owner',
  },
  /** r6 */
  applying: {
    requestId: 'story-contact-request-r6',
    playerId: RAYMARK_ID,
    field: 'phone',
    fromValue: '+63 918 555 0377',
    toValue: '+63 918 555 0415',
    status: 'applying',
    requestedAt: at(30),
    source: 'app',
    approvedAt: at(0) - 12 * MINUTE,
  },
  /** r7 */
  failed: {
    requestId: 'story-contact-request-r7',
    playerId: JOSE_ID,
    field: 'phone',
    fromValue: '+63 917 555 0142',
    toValue: '+63 917 555 0990',
    status: 'failed',
    requestedAt: at(48),
    source: 'app',
    approvedAt: at(24),
    error: "The sign-in provider didn't accept the new number.",
  },
  /** r8 */
  applied: {
    requestId: 'story-contact-request-r8',
    playerId: JOSE_ID,
    field: 'email',
    fromValue: contactChangeExamples.email.from,
    toValue: contactChangeExamples.email.to,
    status: 'applied',
    requestedAt: at(96),
    source: 'app',
    approvedAt: at(72),
    appliedAt: at(72) + 40 * 1000,
  },
  /** r9 */
  rejected: {
    requestId: 'story-contact-request-r9',
    playerId: RAYMARK_ID,
    field: 'email',
    fromValue: 'raymark@example.com',
    toValue: 'raymark.m@example.com',
    status: 'rejected',
    requestedAt: at(144),
    source: 'app',
    decidedAt: at(120),
  },
} satisfies { now: Date } & Record<
  'pending' | 'fromOwner' | 'applying' | 'failed' | 'applied' | 'rejected',
  AdminContactChangeRequest
>
