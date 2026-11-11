import type { SyncArea } from '../sync/sync.types'

/**
 * The real-mode outbox (#722, D-2026-11-11-04, option A). One command per Queue Master write made
 * offline on a downloaded, started session: applied on this device by the mock-store reducers over
 * the downloaded copy, and replayed in order through the real adapter of the same name when the
 * internet returns. Durable in IndexedDB next to the device copy; the play-history file carries it.
 */

/** Ids the local apply created, so the replay can learn the server's ids for them. */
export type CreatedIds = {
  matches: string[]
  courts: string[]
  clubPlayers: string[]
  /** Roster and waitlist rows are learned by re-reading the roster: they are keyed by club player. */
  roster: { id: string; clubPlayerId: string }[]
  waitlist: { id: string; clubPlayerId: string }[]
}

export const emptyCreatedIds = (): CreatedIds => ({
  matches: [],
  courts: [],
  clubPlayers: [],
  roster: [],
  waitlist: [],
})

export type OutboxCommand = {
  /** Idempotency key: the replay sends the same operation, a repeat never saves twice. */
  operationId: string
  /** The registry name (`outbox/commands.ts`): which real adapter replays it. */
  name: string
  /** The hook input as the screen gave it; local ids are rewritten to server ids on replay. */
  args: unknown
  recordedAt: number
  sessionId: string
  /** The toast text of the local save, shown in Q-SYNC's Waiting to sync list. */
  text: string
  area: SyncArea
  /** The data the local apply returned, zipped with the server's reply to learn ids. */
  localData: unknown
  created: CreatedIds
  /** Set when the server refused the replay with a 409: waits for Q-CONFLICT's review. */
  conflict?: { message: string; at: number }
}

/** A command as stored: `seq` orders the outbox, the key scopes it to the account. */
export type StoredCommand = OutboxCommand & { key: string; accountId: string; seq: number }

export type StoredAlias = { key: string; accountId: string; localId: string; serverId: string }

/** The play-history file (`playhistory.json`): the downloaded session(s), their copy and the outbox. */
export type PlayHistoryFile = {
  format: 'rotra-play-history'
  version: 1
  exportedAt: string
  /** Club-level reads the downloaded sessions need (club, saved players, license, session list). */
  clubCopy: { path: string; body: unknown }[]
  sessions: {
    session: {
      sessionId: string
      title: string
      startsAt: number
      downloadedAt: number
      paths: string[]
    }
    deviceCopy: { path: string; body: unknown }[]
    outbox: OutboxCommand[]
  }[]
}

export const PLAY_HISTORY_FILE_NAME = 'playhistory.json'
export const NOT_PLAY_HISTORY = "That file isn't a ROTRA play history."
export const OFFLINE_SAVE_FAILED = "This change couldn't be saved on this device. Nothing changed."
