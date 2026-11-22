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
import { seedLeaderboardHistory } from '../fixtures/leaderboardHistory'
import { claimLinks, playerAccounts } from '../fixtures/playerAccounts'
import { playerAwardHistory } from '../fixtures/playerAwardHistory'
import { createPlayerNotificationFixtures } from '../fixtures/playerNotifications'
import { playerProfiles } from '../fixtures/playerProfiles'
import { createPlayerRankFixtures } from '../fixtures/playerRanks'
import {
  clubPlayers,
  GAB_CLUB_PLAYER_ID,
  GAB_PHONE_E164,
  JOSE_PLAYER_ID,
  players,
} from '../fixtures/players'
import { profileBanners } from '../fixtures/profileBanners'
import { profileCharacters } from '../fixtures/profileCharacters'
import { createQueueFixtures } from '../fixtures/queueSessions'
import { rankingPolicyVersions } from '../fixtures/rankingSettings'
import { createSessionHostFixtures } from '../fixtures/sessionHosts'
import { createSessionPublicationFixtures } from '../fixtures/sessionPublications'
import { createTrustedHostFixtures } from '../fixtures/trustedHosts'
import { seedUnclaimedPlayers } from '../fixtures/unclaimedPlayers'
import { venues } from '../fixtures/venues'
import type { InventoryItem } from '../inventory/inventory.types'
import type { ClubLicenseTerm, ClubRetentionRecord } from '../license/license.types'
import type { AutoQueueDraftState } from '../match/autoQueue.types'
import type { Match } from '../match/match.types'
import type { MatchRequest } from '../match-request/matchRequest.types'
import type { PasswordResetRequest } from '../password-reset/passwordReset.types'
import type { Player, PlayerProfile, PlayerRank, PlayerSessionRecord } from '../player/player.types'
import type { ClaimLinkRecord } from '../player-account/playerAccount.types'
import type { PlayerNotification } from '../player-notifications/playerNotifications.types'
import type { ProfileBanner } from '../profile-banner/profileBanner.types'
import type { ProfileCharacter } from '../profile-character/profileCharacter.types'
import {
  type DownloadState,
  type QueueSession,
  recordsGames,
  type SessionCourt,
  type SessionFinalization,
} from '../queue-session/queueSession.types'
import type { RankingPolicyVersion } from '../ranking-settings/rankingSettings.types'
import { isRealDataMode } from '../real/mode'
import { salesSettingsSeed } from '../sales/sales.fixtures'
import type { SalesSettings } from '../sales/sales.types'
import type { SessionCostEstimate } from '../session-cost/sessionCost.types'
import type { SessionHostRecord } from '../session-host/sessionHost.types'
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
  SessionNoShow,
  SessionPlayer,
  SessionWaitlistEntry,
} from '../session-roster/sessionRoster.types'
import type { SlotTransfer } from '../slot-transfer/slotTransfer.types'
import type { SaveOutcome, SessionIntegrity, SyncState } from '../sync/sync.types'
import type { ClubTrustedHost } from '../trusted-host/trustedHost.types'
import { NotConnectedError } from './errors'
export type MockState = {
  passwordResetRequests: PasswordResetRequest[]
  adminPlayerRecords: Record<string, AdminPlayerRecord>
  inventory: InventoryItem[]
  costEstimates: Record<string, SessionCostEstimate>
  paymentMarks: SessionPaymentMark[]
  playerAccounts: typeof playerAccounts
  playerNotifications: Record<string, PlayerNotification[]>
  verificationReminderReads: Record<string, string>
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
  /** Admin profile character library, shown and hidden (A-CHARACTERS) */
  profileCharacters: ProfileCharacter[]
  /** Admin profile banner library, shown and hidden (A-BANNERS) */
  profileBanners: ProfileBanner[]
  /** Admin configuration › cost per session that Sales estimates with (D-2026-11-08-01) */
  salesSettings: SalesSettings
  venues: ClubVenue[]
  players: Player[]
  clubPlayers: ClubPlayer[]
  /**
   * Each club's trusted-host list (D-2026-11-22-01), current and removed rows. Absent in older
   * saved states reads as none.
   */
  clubTrustedHosts?: ClubTrustedHost[]
  /**
   * Each session's host rows (#1004, D-2026-11-22-01), current and ended. Absent in older saved
   * states reads as none.
   */
  sessionHosts?: SessionHostRecord[]
  sessions: QueueSession[]
  courts: SessionCourt[]
  roster: SessionPlayer[]
  waitlist: SessionWaitlistEntry[]
  /** No show (cancelled) rows taken off live rosters; missing in older saved states */
  noShows?: SessionNoShow[]
  joinRequests: SessionJoinRequest[]
  /** Player-side I can't make it (D-2026-11-09-03), in every state; closed ones stay, hidden */
  dropOutNotices: DropOutNotice[]
  /** Player-side Request a match (D-2026-11-09-05), in every state; closed ones stay, hidden */
  matchRequests: MatchRequest[]
  /** Session invite codes (D-2026-11-09-08): one per Player and session */
  sessionInviteCodes: SessionInviteCode[]
  /** Slot transfers (#1011) in every state; decided ones stay. Missing in older saved states */
  slotTransfers?: SlotTransfer[]
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
  /**
   * A club's own private phone for one of its saved players, by club player id: an unclaimed
   * player's optional phone, or the phone of an older record with no email (Details required).
   */
  privatePhones: Record<string, string>
  /**
   * Lookup pending (D-2026-11-16-04): the email typed for a new player while offline, by club
   * player id, until the device syncs and ROTRA links them or gives them an RTR ID. Absent reads
   * as none.
   */
  pendingEmails?: Record<string, string>
  /**
   * The highest RTR ID number given per place and day ('RTR-PH-CEB-102926-' → 12). It only goes
   * up, so a retired RTR ID, or one Admin moved to another place or date, is never given again.
   * Absent reads as no counters: the players' own RTR IDs still count.
   */
  rtrIdCounters?: Record<string, number>
  sampleRequestIndex: number
  /** Development switch (P12): true once the Google deadline counts as passed; absent reads false */
  googleDeadlinePassed?: boolean
  /**
   * Development stand-in (P12): puts a signed-in player on a session's roster or waitlist so every
   * invite landing state is reachable; keyed `<playerId>:<sessionId>`. Used only when the saved roster and waitlist don't already place them.
   */
  inviteStandings?: Record<string, 'in' | 'waitlist'>
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
  // The seeded completed history sessions carry the snapshot their finalization `slides` stage
  // produced; an unrecorded one never reached that stage and has none.
  const resultSnapshots = Object.fromEntries(
    sessions
      .filter((s) => s.state === 'completed' && recordsGames(s))
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
    playerNotifications: { [JOSE_PLAYER_ID]: createPlayerNotificationFixtures(now) },
    verificationReminderReads: {},
    resetLinks: { 'reset-valid': 'valid' },
    claimLinks,
    contactChangeRequests: createContactChangeRequestFixtures(now),
    rankingPolicyVersions,
    clubs,
    ...createAdminClubFixtures(now),
    adminAuditEvents: createAdminAuditEvents(now),
    adminCommands: {},
    featureFlags,
    profileCharacters,
    profileBanners,
    salesSettings: salesSettingsSeed,
    venues,
    players: [...players, ...requests.players],
    clubPlayers: [...clubPlayers, ...requests.clubPlayers],
    clubTrustedHosts: createTrustedHostFixtures(now),
    sessionHosts: createSessionHostFixtures(now),
    sessions,
    courts,
    roster: [...roster, ...history.roster],
    waitlist: [],
    joinRequests: requests.joinRequests,
    dropOutNotices: requests.dropOutNotices,
    matchRequests: requests.matchRequests,
    sessionInviteCodes: requests.sessionInviteCodes,
    slotTransfers: requests.slotTransfers,
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
    pendingEmails: {},
    rtrIdCounters: {},
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
  seedLeaderboardHistory(state)
  seedUnclaimedPlayers(state, now)
  return state
}
/**
 * Real mode's offline working state (#722, D-2026-11-11-04): while `withWorkingState` runs, the
 * store's reads and writes go to this state instead of the demo data, so the existing mock
 * reducers apply an offline change to the downloaded copy. Null outside such a run, when every
 * mock read or write in real mode refuses as before.
 */
let working: { snapshot: MockState } | null = null

/**
 * Runs `run` with the mock store pointed at `state` (a copy of it), then returns the result and the
 * state as the reducers left it. Callers serialize their runs; a nested run is refused.
 */
export async function withWorkingState<T>(
  state: MockState,
  run: () => Promise<T>,
): Promise<{ result: T; state: MockState }> {
  if (working) throw new Error('A working state is already active.')
  working = { snapshot: structuredClone(state) }
  try {
    const result = await run()
    return { result, state: working.snapshot }
  } finally {
    working = null
  }
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
    getSnapshot: () => (working ? (working.snapshot as DeepReadonly<MockState>) : snapshot),
    getGeneration: () => generation,
    update(change: (draft: MockState) => void) {
      if (working) {
        // The working state is private to one offline apply: no freeze, no listeners.
        const draft = structuredClone(working.snapshot) as MockState
        change(draft)
        working.snapshot = draft
        return
      }
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
  if (working) return structuredClone(working.snapshot)
  if (isRealDataMode()) throw new NotConnectedError()
  return structuredClone(mockStore.getSnapshot()) as MockState
}
