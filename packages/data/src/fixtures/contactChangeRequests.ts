import { normalizeContact } from '../contact-change-request/contactChangeRequest.rules'
import type {
  AdminContactChangeRequest,
  ContactChangeRequest,
  PlayerContactChangeRequest,
} from '../contact-change-request/contactChangeRequest.types'
import { PLAYER_FIXTURE_NOW } from './playerGames'

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
 * IDs of rotra-admin.html's seeded contact requests r1–r9. The decided ones (r7 failed, r8 applied,
 * r9 declined) are also named by the Admin audit fixture.
 */
export const contactRequestFixtureIds = {
  r1: 'contact-request-r1',
  r2: 'contact-request-r2',
  r3: 'contact-request-r3',
  r4: 'contact-request-r4',
  r5: 'contact-request-r5',
  r6: 'contact-request-r6',
  r7: 'contact-request-r7',
  r8: 'contact-request-r8',
  r9: 'contact-request-r9',
}

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const KARL_ID = 'd720c601-da89-5474-9351-00e2fb966e56'
const JOSE_ID = '2c7f6a7b-eed9-5051-9426-6dbce5133fbc'
const RAYMARK_ID = 'bc4c3446-0131-591b-ab03-af19225dbe8a'
const JASPER_ID = 'a22725ed-0ae7-5f29-9ca8-edf1c775b833'
const MIKEE_ID = 'f5a63c91-34fd-53ec-948d-0ef644b5aeac'
const EMJI_ID = '9f83495f-9359-5f7f-82ad-4cf01b826471'
const DALTON_ID = '80861dfd-99c7-57bb-a46c-d8c76e9a8dcc'
const at = (hoursAgo: number) => PLAYER_FIXTURE_NOW.getTime() - hoursAgo * HOUR

/**
 * rotra-admin.html `seedRequests()` r1–r9 (prototype 'submitted' = 'pending'), same fields, states and
 * times relative to `now`, on real players (user decision, 2026-10-30: no new players). Jose, the
 * Player app's signed-in player, has none, so his Privacy and contact screen still starts empty; his
 * phone is the one r2 asks for. Prototype → real: r1 Miguel → Raymark; r2 Dani → Jasper (asks for
 * Jose's number instead of Enzo's); r3/r4 Paulo → Karl; r5 Kat → Mikee Abellana; r6 Theo → Emji;
 * r7 Rafa → Dalton; r8 Bea → Mikee (the change r5 now starts from); r9 Iya → Raymark. Each `from`
 * is the player's account contact (fixtures/playerAccounts.ts), so the checks behave as in the
 * prototype: r1 passes, r2 is linked to Jose, r3 is behind the newer r4.
 */
export function createContactChangeRequestFixtures(now: number): PlayerContactChangeRequest[] {
  const R = (
    key: keyof typeof contactRequestFixtureIds,
    playerId: string,
    field: PlayerContactChangeRequest['field'],
    fromValue: string,
    toValue: string,
    requestedAt: number,
    status: PlayerContactChangeRequest['status'],
    extra: Partial<PlayerContactChangeRequest> = {},
  ): PlayerContactChangeRequest => ({
    requestId: contactRequestFixtureIds[key],
    playerId,
    field,
    fromValue,
    toValue,
    status,
    requestedAt,
    source: 'app',
    originalContactRevision: normalizeContact(field, fromValue),
    providerOperationRef: null,
    ...extra,
  })
  const operation = (key: string) => ({ providerOperationRef: `provider-op-${key}` })
  return [
    R('r1', RAYMARK_ID, 'phone', '+63 918 555 0377', '+63 927 555 0198', now - 2 * HOUR, 'pending'),
    R('r2', JASPER_ID, 'phone', '+63 917 555 0566', '+63 917 555 0142', now - 5 * HOUR, 'pending'),
    R(
      'r3',
      KARL_ID,
      'email',
      'karl@example.com',
      'karl.matina@example.com',
      now - 3 * DAY,
      'pending',
    ),
    R(
      'r4',
      KARL_ID,
      'email',
      'karl@example.com',
      'karl.dvo@example.com',
      now - 22 * HOUR,
      'pending',
    ),
    R(
      'r5',
      MIKEE_ID,
      'email',
      'mikee.abellana@example.com',
      'mikee.abellana.smash@example.com',
      now - 26 * HOUR,
      'pending',
      { source: 'owner' },
    ),
    R('r6', EMJI_ID, 'phone', '+63 905 555 0297', '+63 905 555 0415', now - 30 * HOUR, 'applying', {
      approvedAt: now - 12 * MINUTE,
      ...operation('r6'),
    }),
    R('r7', DALTON_ID, 'phone', '+63 915 555 0814', '+63 915 555 0990', now - 2 * DAY, 'failed', {
      approvedAt: now - DAY,
      error: "The sign-in provider didn't accept the new number.",
      ...operation('r7'),
    }),
    R(
      'r8',
      MIKEE_ID,
      'email',
      'mikee@example.com',
      'mikee.abellana@example.com',
      now - 4 * DAY,
      'applied',
      {
        approvedAt: now - 3 * DAY,
        appliedAt: now - 3 * DAY + 40 * 1000,
        ...operation('r8'),
      },
    ),
    R(
      'r9',
      RAYMARK_ID,
      'email',
      'raymark@example.com',
      'raymark.m@example.com',
      now - 6 * DAY,
      'rejected',
      {
        decidedAt: now - 5 * DAY,
      },
    ),
  ]
}

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
