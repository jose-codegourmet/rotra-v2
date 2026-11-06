import {
  consoleSessionFixture,
  mergedConsoleSessionFixture,
} from '@rotra/data/fixtures/consoleSessions'
import {
  countedGames,
  courtNames,
  courtsNeeded,
  freeCourts,
  listNames,
  type MatchContext,
  matchStatus,
  shortName,
  waitingMatches,
} from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import type { SwapSlot } from '@rotra/ui/swap-sides-area'
import type { TeamLineupPlayer } from '@rotra/ui/team-lineup'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { OnCourtSheet, type OnCourtSheetProps, type OnCourtSwapTarget } from './OnCourtSheet'

const { session, roster, courts, matches } = consoleSessionFixture
const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
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
const matchNo = (n: number, list: Match[] = matches) => {
  const m = list.find((x) => x.matchNo === n)
  if (!m) throw new Error(`Match fixture ${n} missing`)
  return m
}
const playerOf =
  (list: Match[]) =>
  (id: string): TeamLineupPlayer => {
    const p = roster.find((x) => x.id === id)
    if (!p) throw new Error('Roster fixture missing')
    return {
      id: p.id,
      name: p.nameSnapshot,
      shortName: shortName(p),
      level: p.level,
      games: countedGames(p.id, list),
    }
  }
const names = (ids: string[]) =>
  listNames(
    ids.map((id) => {
      const p = roster.find((x) => x.id === id)
      return p ? shortName(p) : 'Player'
    }),
  )

/**
 * The Q-ON-COURT facts for one match placed on `courtIds` (the console fixtures have no On court
 * state yet, so the story places it): the block reason from matchStatus, the swap candidate (first
 * waiting match in queue order that needs as many courts and is ready once this match's players
 * are free), and whether enough other free courts are left to move it.
 */
function onCourt(match: Match, onCourtIds: string[], list: Match[]): OnCourtSheetProps {
  const placed: Match = { ...match, courtIds: onCourtIds }
  const others = list.filter((m) => m.id !== match.id)
  const ctx: MatchContext = { roster, matches: others, courts }
  const status = matchStatus(placed, ctx)
  const queue = waitingMatches(others)
  const nextIndex = queue.findIndex(
    (m) => courtsNeeded(m) === courtsNeeded(placed) && matchStatus(m, ctx).kind === 'ready',
  )
  const next = queue[nextIndex]
  const swapTarget: OnCourtSwapTarget | null = next
    ? {
        matchNo: next.matchNo,
        position: nextIndex + 1,
        teamANames: names(next.teamA),
        teamBNames: names(next.teamB),
      }
    : null
  const otherFree = freeCourts(courts, others).filter((c) => !onCourtIds.includes(c.id))
  return {
    open: true,
    onOpenChange: fn(),
    matchNo: placed.matchNo,
    courtLabel: courtNames(placed, courts),
    format: placed.format,
    placedLabel: fmtTime(Date.now() - 2 * 60000),
    teamA: placed.teamA.map(playerOf(list)),
    teamB: placed.teamB.map(playerOf(list)),
    minimumGames: session.minimumGames,
    blockReason: status.kind === 'needs-attention' ? status.reason : undefined,
    swapTarget,
    canMoveCourt: otherFree.length >= courtsNeeded(placed),
    onSelectPlayer: fn(),
    onSwap: fn(),
    onReplacePlayer: fn(),
    onMoveCourt: fn(),
    onSwapWithQueue: fn(),
    onSendBack: fn(),
    onStart: fn(),
  }
}

// Match 8 waits at the back of the queue with four free players, so it is the first ready match
// once Match 3 holds Court 2 (#2 waits on Jose, who is playing; #4 has a player not present).
const withMatch8: Match[] = [
  ...matches,
  {
    ...matchNo(3),
    id: 'console-match-8',
    matchNo: 8,
    queuePosition: 8,
    teamA: [9, 10].map(pid),
    teamB: [11, 12].map(pid),
  },
]
const ready = onCourt(matchNo(3), [courtId(1)], withMatch8)
// Match 4 on Court 2 with a player marked not present; Match 3 is next and ready.
const notPresent = onCourt(matchNo(4), [courtId(1)], matches)
// The merged 5v5 on Court 1 + Court 2 (shown getting ready): no other 5v5 waits to swap with.
const mergedMatch = mergedConsoleSessionFixture.matches.find((m) => m.format === 'fun_5v5')
if (!mergedMatch) throw new Error('5v5 fixture missing')
const fiveVFive = onCourt(mergedMatch, mergedMatch.courtIds, mergedConsoleSessionFixture.matches)

/** Keeps the switched sides so dragging can be tried. */
function Demo(args: OnCourtSheetProps) {
  const [teams, setTeams] = useState({ teamA: args.teamA, teamB: args.teamB })
  return (
    <OnCourtSheet
      {...args}
      {...teams}
      onSwap={(from: SwapSlot, to: SwapSlot) => {
        args.onSwap(from, to)
        setTeams((prev) => {
          const next = { teamA: [...prev.teamA], teamB: [...prev.teamB] }
          const a = from.team === 'A' ? next.teamA : next.teamB
          const b = to.team === 'A' ? next.teamA : next.teamB
          const x = a[from.index],
            y = b[to.index]
          if (!x || !y) return prev
          a[from.index] = y
          b[to.index] = x
          return next
        })
      }}
    />
  )
}

const meta = {
  title: 'Queue/OnCourtSheet',
  component: OnCourtSheet,
  args: ready,
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof OnCourtSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Match 3 getting ready on Court 2; Swap with #3 names Match 8. */
export const Ready: Story = {}

/** A player is not present: the reason shows and Start match is disabled. */
export const PlayerNotPresent: Story = { args: notPresent }

/** A 5v5 fun game on Court 1 + Court 2: no other 5v5 is ready, so Swap with the queue is disabled. */
export const FiveVFive: Story = { args: fiveVFive }

/** No other waiting match is ready for this court. */
export const NoSwapCandidate: Story = { args: { swapTarget: null } }

/** No other free open court: Move to another court is disabled. */
export const NoFreeCourt: Story = { args: { canMoveCourt: false } }

/** Start match is running: it cannot fire twice and the sheet cannot be dismissed. */
export const Starting: Story = { args: { pendingAction: 'start' } }

/** Send back to queue is running. */
export const SendingBack: Story = { args: { pendingAction: 'send-back' } }

/** The recheck at Start match found a change: nothing started. */
export const SomethingChanged: Story = {
  args: { message: 'Something changed. Review the match again.' },
}

/** The local save failed: the match is still getting ready. */
export const SaveFailed: Story = { args: { error: 'Changes could not be saved' } }

export const ReadyLight: Story = { globals: { theme: 'light' } }
export const PlayerNotPresentLight: Story = {
  args: notPresent,
  globals: { theme: 'light' },
}
export const FiveVFiveLight: Story = { args: fiveVFive, globals: { theme: 'light' } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const PhoneFiveVFive: Story = {
  args: fiveVFive,
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
