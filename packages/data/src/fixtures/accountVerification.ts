import { adminPlayerOf } from '../admin-player/fetchers'
import { normalizeContact } from '../contact-change-request/contactChangeRequest.rules'
import { OPEN_CONTACT_CHANGE_STATUSES } from '../contact-change-request/contactChangeRequest.types'
import { isProductionBuild } from '../mock/env'
import { mockStore } from '../mock/store'
import type { PlayerAccountRecord } from '../player-account/playerAccount.types'
import { adminAccount } from './adminAccounts'
import { playerAccounts } from './playerAccounts'

const demoAccount = playerAccounts.find((account) => account.email === 'jose@example.com')
if (!demoAccount) throw new Error('Missing the demo account for verification fixtures.')

export const verificationFixturePlayerId = demoAccount.playerId
const demoEmail = demoAccount.email

type VerificationFixture = Pick<PlayerAccountRecord, 'phone' | 'googleEmail'> & {
  pendingEmailRequest?: boolean
  adminOverrideReason?: string
}

const googleEmail = 'jose.plays@gmail.com'
export const accountVerificationFixtures = {
  zeroOfThree: { phone: '', googleEmail: null },
  oneOfThree: { phone: demoAccount.phone, googleEmail: null },
  mismatch: { phone: demoAccount.phone, googleEmail },
  mismatchPending: { phone: demoAccount.phone, googleEmail, pendingEmailRequest: true },
  noPhone: { phone: '', googleEmail: demoAccount.email },
  allThree: { phone: demoAccount.phone, googleEmail: demoAccount.email },
  verifiedByAdmin: {
    phone: demoAccount.phone,
    googleEmail: null,
    adminOverrideReason: 'Confirmed ownership with the player.',
  },
} satisfies Record<string, VerificationFixture>

const requestId = 'verification-fixture-email-change'
const auditId = 'verification-fixture-admin-override'

/**
 * Switch the demo account to one verification fixture in a mock development session. Invalidate
 * active queries after applying it. For the signed-out state, use the normal Player sign-out.
 */
export function applyAccountVerificationFixture(scenario: keyof typeof accountVerificationFixtures) {
  if (isProductionBuild()) return
  const fixture: VerificationFixture = accountVerificationFixtures[scenario]
  const playerId = verificationFixturePlayerId
  const now = Date.now()
  const at = new Date(now).toISOString()
  mockStore.update((draft) => {
    const account = draft.playerAccounts.find((entry) => entry.playerId === playerId)
    const player = draft.players.find((entry) => entry.id === playerId)
    if (!account?.claimed || !player) throw new Error('Missing the demo account for verification.')

    account.email = demoEmail
    account.phone = fixture.phone
    account.googleEmail = fixture.googleEmail
    account.googleLinkedAt = fixture.googleEmail ? at : null

    draft.contactChangeRequests = draft.contactChangeRequests.filter(
      (request) =>
        request.requestId !== requestId &&
        (request.playerId !== playerId || !OPEN_CONTACT_CHANGE_STATUSES.includes(request.status)),
    )
    if (fixture.pendingEmailRequest && fixture.googleEmail) {
      draft.contactChangeRequests.push({
        requestId,
        playerId,
        field: 'email',
        fromValue: account.email,
        toValue: fixture.googleEmail,
        status: 'pending',
        requestedAt: now,
        source: 'app',
        originalContactRevision: normalizeContact('email', account.email),
        providerOperationRef: null,
      })
    }

    const record = (draft.adminPlayerRecords[playerId] ??= {
      archivedAt: null,
      revision: 1,
      createdByClubId: adminPlayerOf(draft, player).createdByClubId,
      adminCreated: false,
    })
    record.revision++
    record.verificationOverride = fixture.adminOverrideReason
      ? { status: 'verified', adminId: adminAccount.id, at }
      : null
    draft.adminAuditEvents = draft.adminAuditEvents.filter((event) => event.id !== auditId)
    if (fixture.adminOverrideReason) {
      draft.adminAuditEvents.unshift({
        id: auditId,
        actorEmail: adminAccount.email,
        action: 'player_verification_override_set',
        targetType: 'player',
        targetId: playerId,
        at,
        summary: `Set ${player.fullName} to Verified by Admin. Reason: ${fixture.adminOverrideReason}`,
      })
    }
  })
}
