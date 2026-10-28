import type { Club } from '../club/club.types'
import type { ClubPlayer } from '../club-player/clubPlayer.types'
import type { ClubVenue } from '../club-venue/clubVenue.types'
import { clubs } from '../fixtures/clubs'
import { licensePayments } from '../fixtures/licensePayments'
import { clubPlayers, players } from '../fixtures/players'
import { createQueueFixtures } from '../fixtures/queueSessions'
import { rankingSettings } from '../fixtures/rankingSettings'
import { venues } from '../fixtures/venues'
import type { ClubLicenseTerm } from '../license/license.types'
import type { Match } from '../match/match.types'
import { playerProfiles } from '../fixtures/playerProfiles'
import type { PlayerProfile } from '../player/player.types'
import { createPlayerRankFixtures } from '../fixtures/playerRanks'
import type { PlayerRank, PlayerSessionRecord } from '../player/player.types'
import type { Player } from '../player/player.types'
import type { DownloadState, QueueSession, SessionCourt } from '../queue-session/queueSession.types'
import type { RankingSettings } from '../ranking-settings/rankingSettings.types'
import type {
  SessionJoinRequest,
  SessionPlayer,
  SessionWaitlistEntry,
} from '../session-roster/sessionRoster.types'
import type { SaveOutcome, SyncState } from '../sync/sync.types'
export type MockState = {
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
  const now = Date.now()
  return structuredClone({
    ...createPlayerRankFixtures(),
    playerProfiles,
    rankingSettings,
    clubs,
    venues,
    players,
    clubPlayers,
    ...createQueueFixtures(now),
    waitlist: [],
    joinRequests: [],
    licensePayments,
    downloads: {},
    matches: [],
    matchSequences: {},
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
