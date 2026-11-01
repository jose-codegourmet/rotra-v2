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
export type AutoQueueDraftState = {
  batches: Partial<Record<AutoQueueMode, AutoQueueDraftBatch>>
  /** Order of selection, including drafts from other alternative tabs. */
  selectedIds: string[]
  committedIds: string[]
}
