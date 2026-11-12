import type { Engine } from './engine.ts'
import type { AutoQueueMode, BaggingSettings, Match, SessionCourt } from './rules.ts'

/** A Queue Session's shape: who comes, how many courts, how long, which formats. */
export type Shape = {
  name: string
  players: number
  courts: number
  hours: number
  singles: boolean
  doubles: boolean
  /** Slot budget = courts × playersPerCourt. */
  playersPerCourt: number
}

export const SHAPES = {
  standard: {
    name: 'Standard',
    players: 24,
    courts: 4,
    hours: 3,
    singles: true,
    doubles: true,
    playersPerCourt: 6,
  },
  small: {
    name: 'Small',
    players: 12,
    courts: 2,
    hours: 2,
    singles: false,
    doubles: true,
    playersPerCourt: 6,
  },
  big: {
    name: 'Big',
    players: 40,
    courts: 6,
    hours: 4,
    singles: true,
    doubles: true,
    playersPerCourt: 7,
  },
  notFull: {
    name: 'Not full',
    players: 18,
    courts: 4,
    hours: 3,
    singles: false,
    doubles: true,
    playersPerCourt: 6,
  },
} satisfies Record<string, Shape>

/** Generate matches tabs, by their screen names. */
export const STRATEGIES = {
  'Fewest Games': 'fewest',
  'Available Players': 'available',
  'Longest Wait': 'wait',
  'Plan Ahead': 'ahead',
} as const satisfies Record<string, AutoQueueMode>
export type StrategyName = keyof typeof STRATEGIES

/**
 * Something that happens at a virtual minute. `apply` returns `retry` to try again a minute later
 * (nobody suitable right now), `skip` to give up (logged). Match requests (REG-17..22) plug in here
 * as another event kind.
 */
export type SimEvent = {
  at: number
  kind: string
  label: string
  apply: (engine: Engine) => Promise<'done' | 'retry' | 'skip'>
}

/**
 * A disruption or check, made of events plus optional hooks into the Queue Master's routine.
 * `plan` runs once the roster exists (roster ids known) and returns the events to schedule.
 */
export type SimPlugin = {
  name: string
  /** Before the session starts: who is not Present at Start (Late), etc. */
  prepare?: (engine: Engine) => Promise<void> | void
  plan?: (engine: Engine) => SimEvent[]
  /** Choose the outcome of a finished match: `invalid` marks it invalid instead of Match done. */
  decide?: (engine: Engine, match: Match) => 'invalid' | undefined
  /** A court to leave free after this match's result (Q-NEXT-MATCH holdCourtId). */
  holdCourt?: (engine: Engine, match: Match) => string | undefined
  afterResult?: (engine: Engine, match: Match) => Promise<void>
  /** Before Start match on an On court match; return false to leave it unstarted this step. */
  beforeStart?: (engine: Engine, match: Match) => Promise<boolean | undefined>
  afterStep?: (engine: Engine) => Promise<void> | void
  /** Final checks after Session done (add failures through engine.fail). */
  finish?: (engine: Engine) => Promise<void> | void
}

export type SimConfig = {
  id: string
  scenario: string
  shape: Shape
  strategy: StrategyName
  seed: number
  /** Operator-set minimum (minimumIsCalculated false); calculated when left out. */
  operatorMinimum?: number
  /** Initial courts' own booking ends, by index (minutes from start). */
  courtOpenUntil?: Record<number, number>
  /** Extra roster entries over the slot budget (Add anyway). */
  overfill?: number
  bagging?: (engine: Engine) => BaggingSettings
  plugins?: SimPlugin[]
}

export type CourtView = SessionCourt
