import type { MatchLineup } from './match.types'

export type AutoQueueMode = 'available' | 'ahead' | 'wait' | 'fewest' | 'catchup'
export type AutoQueueCount = 2 | 3 | 4 | 6
export type AutoQueueDraftLineup = MatchLineup & {
  id: string
  mode: AutoQueueMode
  reason: string
  /** Inputs at generation, never a predicted finish time. */
  fingerprint: string
}
export type AutoQueueDraftBatch = {
  drafts: AutoQueueDraftLineup[]
  stopReason?: string
  catchUpTarget?: number
}
/**
 * Which of a bagging pair's games together it applies to (#739): `all`, or game numbers from 1 to
 * the session minimum. Picking every number, or none, is stored as `all`.
 */
export type BaggingGames = 'all' | number[]
/** Two present roster players kept together as partners by Generate matches while Bagging mode is on. */
export type BaggingPair = {
  id: string
  /** Roster (SessionPlayer) ids */
  a: string
  b: string
  games: BaggingGames
}
/** The session-wide Bagging mode switch and its pairs list; kept with the drafts, never saved. */
export type BaggingSettings = {
  enabled: boolean
  pairs: BaggingPair[]
}
export type AutoQueueDraftState = {
  batches: Partial<Record<AutoQueueMode, AutoQueueDraftBatch>>
  /** Order of selection, including drafts from other alternative tabs. */
  selectedIds: string[]
  committedIds: string[]
  bagging: BaggingSettings
}
