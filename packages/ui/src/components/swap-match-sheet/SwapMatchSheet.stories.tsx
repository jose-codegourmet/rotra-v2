import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import {
  countedGames,
  courtNames,
  shortName,
  waitingMatches,
  waitMinutes,
} from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { type SwapMatchLineup, SwapMatchSheet, type SwapMatchSheetProps } from './SwapMatchSheet'

const { session, roster, courts, matches } = consoleSessionFixture
const pid = (i: number) => {
  const p = roster[i]
  if (!p) throw new Error('Roster fixture missing')
  return p.id
}
const courtId = (i: number) => {
  const c = courts[i]
  if (!c) throw new Error('Court fixture missing')
  return c.id
}
const matchNo = (n: number) => {
  const m = matches.find((x) => x.matchNo === n)
  if (!m) throw new Error(`Match fixture ${n} missing`)
  return m
}

// Match 3 is getting ready on Court 2. Match 8 waits with four free players and is the first
// ready match in the queue (#2 waits on a player who is playing; #4 has a player not present).
const current: Match = { ...matchNo(3), courtIds: [courtId(1)] }
const incoming: Match = {
  ...matchNo(3),
  id: 'console-match-8',
  matchNo: 8,
  queuePosition: 8,
  teamA: [9, 10].map(pid),
  teamB: [11, 12].map(pid),
}
const list = [...matches.filter((m) => m.id !== current.id), current, incoming]
const position = waitingMatches(list.filter((m) => m.id !== current.id)).indexOf(incoming) + 1

/** Each picture's games this session and minutes since the player's last game at `now`. */
function lineup(m: Match, now: number): SwapMatchLineup {
  const player = (id: string) => {
    const p = roster.find((x) => x.id === id)
    if (!p) throw new Error('Roster fixture missing')
    return {
      id: p.id,
      name: p.nameSnapshot,
      shortName: shortName(p),
      games: countedGames(p.id, list),
      waitMinutes: waitMinutes(p, list, session.startedAt, now),
    }
  }
  return { matchNo: m.matchNo, teamA: m.teamA.map(player), teamB: m.teamB.map(player) }
}

const propsAt = (now: number): SwapMatchSheetProps => ({
  open: true,
  onOpenChange: fn(),
  courtLabel: courtNames(current, courts),
  current: lineup(current, now),
  incoming: lineup(incoming, now),
  position,
  minimumGames: session.minimumGames,
  onBack: fn(),
  onConfirm: fn(),
})

// Five minutes into the session: every wait is under 10 min (plain).
const plain = propsAt(session.startedAt + 5 * 60000)
// An hour in: players from the finished games waited 10 min (warning), the rest 60 min (error).
const longWaits = propsAt(session.startedAt + 60 * 60000)

const meta = {
  title: 'Queue/SwapMatchSheet',
  component: SwapMatchSheet,
  args: plain,
} satisfies Meta<typeof SwapMatchSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Opened from the court card's ⋯ menu: Cancel; every wait under 10 min. */
export const Plain: Story = {}

/** Opened from the On court sheet: Back to match. */
export const FromMatch: Story = { args: { fromMatch: true } }

/** Waits of 10–15 min in the warning color and 16+ in the error color. */
export const WarningAndErrorWaits: Story = { args: longWaits }

/** Swap matches is running: it cannot fire twice and the sheet cannot be dismissed. */
export const Pending: Story = { args: { isPending: true } }

/** The recheck found a different next match: nothing moved. */
export const SomethingChanged: Story = {
  args: { message: 'Something changed. Review the match again.' },
}

/** The local save failed. */
export const SaveFailed: Story = { args: { error: 'Changes could not be saved' } }

export const PlainLight: Story = { globals: { theme: 'light' } }
export const WarningAndErrorWaitsLight: Story = { args: longWaits, globals: { theme: 'light' } }

export const Phone: Story = { args: longWaits, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
