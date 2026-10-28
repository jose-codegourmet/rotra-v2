import { inventoryItems } from '../fixtures/inventory'
import { createFinancialFixtures } from '../fixtures/financials'
import type { InventoryItem } from '../inventory/inventory.types'
import type { SessionCostEstimate } from '../session-cost/sessionCost.types'
import type { SessionPaymentMark } from '../session-payment/sessionPayment.types'
import type { Club } from '../club/club.types'
import type { ClubPlayer } from '../club-player/clubPlayer.types'
import type { ClubVenue } from '../club-venue/clubVenue.types'
import { clubs } from '../fixtures/clubs'
import { licensePayments } from '../fixtures/licensePayments'
import { playerAccounts } from '../fixtures/playerAccounts'
import { playerAwardHistory } from '../fixtures/playerAwardHistory'
import { playerProfiles } from '../fixtures/playerProfiles'
import { createPlayerRankFixtures } from '../fixtures/playerRanks'
import { clubPlayers, players } from '../fixtures/players'
import { createQueueFixtures } from '../fixtures/queueSessions'
import { rankingSettings } from '../fixtures/rankingSettings'
import { createSessionPublicationFixtures } from '../fixtures/sessionPublications'
import { venues } from '../fixtures/venues'
import type { ClubLicenseTerm } from '../license/license.types'
import type { Match } from '../match/match.types'
import type { Player, PlayerProfile, PlayerRank, PlayerSessionRecord } from '../player/player.types'
import type {
  DownloadState,
  QueueSession,
  SessionCourt,
  SessionFinalization,
} from '../queue-session/queueSession.types'
import type { RankingSettings } from '../ranking-settings/rankingSettings.types'
import { createResultSnapshot } from '../session-result/sessionResult.rules'
import type {
  PlayerAwardHistory,
  SessionPublication,
  SessionPublicationEvent,
  SessionResultSnapshot,
} from '../session-result/sessionResult.types'
import type {
  SessionJoinRequest,
  SessionPlayer,
  SessionWaitlistEntry,
} from '../session-roster/sessionRoster.types'
import type { SaveOutcome, SyncState } from '../sync/sync.types'
export type MockState = {
  inventory: InventoryItem[]
  costEstimates: Record<string, SessionCostEstimate>
  paymentMarks: SessionPaymentMark[]
  playerAccounts: typeof playerAccounts
  resetLinks: Record<string, 'valid' | 'used'>
  playerProfiles: PlayerProfile[]
  playerRanks: Record<string, PlayerRank>
  playerGames: Record<string, PlayerSessionRecord[]>
  rankingSettings: RankingSettings
  clubs: Club[]
  venues: ClubVenue[]
  players: Player[]
  clubPlayers: ClubPlayer[]
  sessions: QueueSession[]
  courts: SessionCourt[]
  roster: SessionPlayer[]
  waitlist: SessionWaitlistEntry[]
  joinRequests: SessionJoinRequest[]
  licensePayments: ClubLicenseTerm[]
  downloads: Record<string, DownloadState>
  sync: SyncState
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
    { sessions, courts, roster, history } = createQueueFixtures(now),
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
  return structuredClone({
    ...createPlayerRankFixtures(),
    ...createFinancialFixtures([...roster, ...history.roster], now),
    inventory: inventoryItems,
    playerProfiles,
    playerAccounts,
    resetLinks: { 'reset-valid': 'valid' },
    rankingSettings,
    clubs,
    venues,
    players,
    clubPlayers,
    sessions,
    courts,
    roster: [...roster, ...history.roster],
    waitlist: [],
    joinRequests: [],
    licensePayments,
    downloads: {},
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
export const readMockState = (): MockState => structuredClone(mockStore.getSnapshot()) as MockState
