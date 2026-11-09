import type { AdminAuditEvent } from '../admin-audit/adminAudit.types'
import type { AdminPlayerRecord } from '../admin-player/adminPlayer.types'
import type { AdminClubRecord, Club, ClubAccount, ClubNameChangeRequest } from '../club/club.types'
import type { ClubPlayer } from '../club-player/clubPlayer.types'
import type { ClubVenue } from '../club-venue/clubVenue.types'
import type { PlayerContactChangeRequest } from '../contact-change-request/contactChangeRequest.types'
import type { FeatureFlag } from '../feature-flag/featureFlag.types'
import { createAdminAuditEvents } from '../fixtures/adminAuditEvents'
import {
  adminClubRetentionRecords,
  adminClubTerms,
  createAdminClubFixtures,
} from '../fixtures/adminClubs'
import { seedAdminPlayerManagement } from '../fixtures/adminPlayerManagement'
import { clubs } from '../fixtures/clubs'
import { createContactChangeRequestFixtures } from '../fixtures/contactChangeRequests'
import { featureFlags } from '../fixtures/featureFlags'
import { createFinancialFixtures } from '../fixtures/financials'
import { inventoryItems } from '../fixtures/inventory'
import { claimLinks, playerAccounts } from '../fixtures/playerAccounts'
import { playerAwardHistory } from '../fixtures/playerAwardHistory'
import { playerProfiles } from '../fixtures/playerProfiles'
import { createPlayerRankFixtures } from '../fixtures/playerRanks'
import { clubPlayers, players } from '../fixtures/players'
import { createQueueFixtures } from '../fixtures/queueSessions'
import { rankingPolicyVersions } from '../fixtures/rankingSettings'
import { createSessionPublicationFixtures } from '../fixtures/sessionPublications'
import { venues } from '../fixtures/venues'
import type { InventoryItem } from '../inventory/inventory.types'
import type { ClubLicenseTerm, ClubRetentionRecord } from '../license/license.types'
import type { AutoQueueDraftState } from '../match/autoQueue.types'
import type { Match } from '../match/match.types'
import type { MatchRequest } from '../match-request/matchRequest.types'
import type { PasswordResetRequest } from '../password-reset/passwordReset.types'
import type { Player, PlayerProfile, PlayerRank, PlayerSessionRecord } from '../player/player.types'
import type { ClaimLinkRecord } from '../player-account/playerAccount.types'
import type {
  DownloadState,
  QueueSession,
  SessionCourt,
  SessionFinalization,
} from '../queue-session/queueSession.types'
import type { RankingPolicyVersion } from '../ranking-settings/rankingSettings.types'
import { isRealDataMode } from '../real/mode'
import { salesSettingsSeed } from '../sales/sales.fixtures'
import type { SalesSettings } from '../sales/sales.types'
import type { SessionCostEstimate } from '../session-cost/sessionCost.types'
import type { SessionPaymentMark } from '../session-payment/sessionPayment.types'
import { createResultSnapshot } from '../session-result/sessionResult.rules'
import type {
  PlayerAwardHistory,
  SessionPublication,
  SessionPublicationEvent,
  SessionResultSnapshot,
} from '../session-result/sessionResult.types'
import type {
  DropOutNotice,
  SessionInviteCode,
  SessionJoinRequest,
  SessionPlayer,
  SessionWaitlistEntry,
} from '../session-roster/sessionRoster.types'
import type { SaveOutcome, SessionIntegrity, SyncState } from '../sync/sync.types'
import { NotConnectedError } from './errors'
export type MockState = {
  passwordResetRequests: PasswordResetRequest[]
  adminPlayerRecords: Record<string, AdminPlayerRecord>
  inventory: InventoryItem[]
  costEstimates: Record<string, SessionCostEstimate>
  paymentMarks: SessionPaymentMark[]
  playerAccounts: typeof playerAccounts
  resetLinks: Record<string, 'valid' | 'used'>
  claimLinks: Record<string, ClaimLinkRecord>
  /** Player requests and their Admin review/application, in every state */
  contactChangeRequests: PlayerContactChangeRequest[]
  playerProfiles: PlayerProfile[]
  playerRanks: Record<string, PlayerRank>
  playerGames: Record<string, PlayerSessionRecord[]>
  /** Ranking settings versions, oldest first; append-only. The newest is in effect. */
  rankingPolicyVersions: RankingPolicyVersion[]
  clubs: Club[]
  /** Admin: one dedicated sign-in per club (no password is ever stored) */
  clubAccounts: ClubAccount[]
  /** Admin: name change requests in every state; Queue's own request stays on Club.pendingNameChange */
  clubNameChangeRequests: ClubNameChangeRequest[]
  adminClubRecords: AdminClubRecord[]
  /** Admin "Record of actions", newest first; append-only */
  adminAuditEvents: AdminAuditEvent[]
  /** Admin Add club replays: source command ID → the club it created */
  adminCommands: Record<string, { clubId: string }>
  /** Admin feature flags in list order; the catalog starts empty */
  featureFlags: FeatureFlag[]
  /** Admin configuration › cost per session that Sales estimates with (D-2026-11-08-01) */
  salesSettings: SalesSettings
  venues: ClubVenue[]
  players: Player[]
  clubPlayers: ClubPlayer[]
  sessions: QueueSession[]
  courts: SessionCourt[]
  roster: SessionPlayer[]
  waitlist: SessionWaitlistEntry[]
  joinRequests: SessionJoinRequest[]
  /** Player-side I can't make it (D-2026-11-09-03), in every state; closed ones stay, hidden */
  dropOutNotices: DropOutNotice[]
  /** Player-side Request a match (D-2026-11-09-05), in every state; closed ones stay, hidden */
  matchRequests: MatchRequest[]
  /** Session invite codes (D-2026-11-09-08): one per Player and session */
  sessionInviteCodes: SessionInviteCode[]
  /** Every club's license terms (Admin A-LICENSE); Queue reads the demo club's as its payments */
  licensePayments: ClubLicenseTerm[]
  /** Admin: public-page retention per club (cancelled countdowns, failed or finished deletion) */
  clubRetentionRecords: ClubRetentionRecord[]
  downloads: Record<string, DownloadState>
  downloadInfo: Record<string, { downloadedAt: number | null; error?: string }>
  sync: SyncState
  sessionIntegrity: Record<string, SessionIntegrity>
  autoQueueDrafts: Record<string, AutoQueueDraftState>
  matches: Match[]
  matchSequences: Record<string, number>
  finalizations: Record<string, SessionFinalization>
  awardHistory: PlayerAwardHistory[]
  /** One private snapshot per validly finalized session; invalid sessions never get one. */
  resultSnapshots: Record<string, SessionResultSnapshot>
  publications: Record<string, SessionPublication>
  publicationEvents: SessionPublicationEvent[]
  operations: Record<string, { fingerprint: string; outcome: SaveOutcome & { data: unknown } }>
  privatePhones: Record<string, string>
  sampleRequestIndex: number
}
type DeepReadonly<T> = T extends object ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> } : T
function freeze<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child)
    Object.freeze(value)
  }
  return value as DeepReadonly<T>
}
function seedState(): MockState {
  const now = Date.now(),
    { sessions, courts, roster, history, requests } = createQueueFixtures(now),
    publicationFixtures = createSessionPublicationFixtures(now)
  // The seeded completed history sessions carry the snapshot their finalization `slides` stage produced.
  const resultSnapshots = Object.fromEntries(
    sessions
      .filter((s) => s.state === 'completed')
      .map((s) => [
        s.id,
        createResultSnapshot({
          sessionId: s.id,
          roster: history.roster,
          matches: history.matches,
          history: playerAwardHistory,
          players: clubPlayers,
          generatedAt: s.finalizedAt ?? now,
        }),
      ]),
  )
  const state: MockState = structuredClone({
    passwordResetRequests: [
      {
        id: 'password-request-demo',
        email: playerAccounts[0]?.email ?? 'jose@example.com',
        playerId: playerAccounts[0]?.playerId ?? null,
        playerName:
          playerProfiles.find((p) => p.playerId === playerAccounts[0]?.playerId)?.fullName ??
          'Jose Adrian',
        rtrId:
          playerProfiles.find((p) => p.playerId === playerAccounts[0]?.playerId)?.rtrId ?? null,
        status: 'pending',
        requestedAt: new Date(now).toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        canIssue: true,
      },
    ],
    adminPlayerRecords: {},
    ...createPlayerRankFixtures(),
    ...createFinancialFixtures([...roster, ...history.roster], now),
    inventory: inventoryItems,
    playerProfiles,
    playerAccounts,
    resetLinks: { 'reset-valid': 'valid' },
    claimLinks,
    contactChangeRequests: createContactChangeRequestFixtures(now),
    rankingPolicyVersions,
    clubs,
    ...createAdminClubFixtures(now),
    adminAuditEvents: createAdminAuditEvents(now),
    adminCommands: {},
    featureFlags,
    salesSettings: salesSettingsSeed,
    venues,
    players,
    clubPlayers,
    sessions,
    courts,
    roster: [...roster, ...history.roster],
    waitlist: [],
    joinRequests: requests.joinRequests,
    dropOutNotices: requests.dropOutNotices,
    matchRequests: [],
    sessionInviteCodes: requests.sessionInviteCodes,
    licensePayments: adminClubTerms,
    clubRetentionRecords: adminClubRetentionRecords,
    downloads: {},
    downloadInfo: {},
    sessionIntegrity: {},
    autoQueueDrafts: {},
    matches: history.matches,
    matchSequences: history.matchSequences,
    finalizations: history.finalizations,
    awardHistory: playerAwardHistory,
    resultSnapshots,
    publications: publicationFixtures.publications,
    publicationEvents: publicationFixtures.events,
    operations: {},
    privatePhones: {},
    sampleRequestIndex: 0,
    sync: {
      online: true,
      syncing: false,
      pendingCount: 0,
      lastSyncedAt: now,
      syncedCount: 0,
      log: [],
    },
  })
  seedAdminPlayerManagement(state)
  return state
}
/** Reset is in-memory only; neither fixture objects nor snapshots can be mutated through a reader. */
export function createMockStore() {
  let snapshot = freeze(seedState())
  let generation = 0
  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of listeners) listener()
  }
  return {
    getSnapshot: () => snapshot,
    getGeneration: () => generation,
    update(change: (draft: MockState) => void) {
      if (isRealDataMode()) throw new NotConnectedError()
      const draft = structuredClone(snapshot) as MockState
      change(draft)
      snapshot = freeze(structuredClone(draft))
      notify()
    },
    reset() {
      generation++
      snapshot = freeze(seedState())
      notify()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
export const mockStore = createMockStore()
/** Mock reads and writes refuse in real data mode, so nothing falls back to in-memory data. */
export const readMockState = (): MockState => {
  if (isRealDataMode()) throw new NotConnectedError()
  return structuredClone(mockStore.getSnapshot()) as MockState
}
