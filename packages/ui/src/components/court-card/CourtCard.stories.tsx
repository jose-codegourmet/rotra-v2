import {
  consoleSessionFixture,
  mergedConsoleSessionFixture,
} from '@rotra/data/fixtures/consoleSessions'
import {
  courtNames,
  FORMAT_LABELS,
  type MatchContext,
  matchStatus,
  nextEligibleForCourt,
  shortName,
} from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import type { SessionCourt } from '@rotra/data/queue-session/types'
import { AddCourtTile } from '@rotra/ui/add-court-tile'
import type { CourtPlayer } from '@rotra/ui/court-drawing'
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import {
  CourtCard,
  type CourtCardFreeProps,
  type CourtCardInGameProps,
  type CourtCardNextMatch,
  type CourtCardProps,
} from './CourtCard'

const { session, roster, courts, matches } = consoleSessionFixture
const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const courtAt = (i: number): SessionCourt => {
  const c = courts[i]
  if (!c) throw new Error('Court fixture missing')
  return c
}
const matchAt = (i: number, list: Match[] = matches): Match => {
  const m = list[i]
  if (!m) throw new Error('Match fixture missing')
  return m
}
const playerOf = (id: string): CourtPlayer => {
  const p = roster.find((x) => x.id === id)
  if (!p) throw new Error('Roster fixture missing')
  return { id: p.id, name: p.nameSnapshot, shortName: shortName(p), level: p.level }
}
const untilOf = (c: SessionCourt) => fmtTime(c.openUntil ?? session.scheduledEndAt)

const playing = matchAt(0),
  blocked = matchAt(1),
  ready = matchAt(2),
  absent = matchAt(3),
  withSubs = matchAt(4),
  merged = matchAt(0, mergedConsoleSessionFixture.matches)

function inGame(m: Match, overrides: Partial<CourtCardInGameProps> = {}): CourtCardInGameProps {
  const isMerged = m.courtIds.length > 1
  return {
    variant: 'in-game',
    label: isMerged ? courtNames(m, courts) : courtAt(0).label,
    untilLabel: untilOf(courtAt(0)),
    merged: isMerged,
    teamA: m.teamA.map(playerOf),
    teamB: m.teamB.map(playerOf),
    onOpenProfile: fn(),
    formatLabel: FORMAT_LABELS[m.format],
    matchNo: m.matchNo,
    minutes: Math.max(0, Math.round((Date.now() - (m.startedAt ?? Date.now())) / 60000)),
    substitutions: m.substitutions.length,
    onOpenMatch: fn(),
    ...overrides,
  }
}

/** The free-card body the container derives from nextEligibleForCourt() and matchStatus(). */
function nextFor(court: SessionCourt, list: Match[]) {
  const ctx: MatchContext = { roster, matches: list, courts }
  const waiting = list
    .filter((m) => m.state === 'waiting')
    .sort((a, b) => a.queuePosition - b.queuePosition)
  const { match, skipped } = nextEligibleForCourt(court.id, ctx)
  const first = waiting[0]
  const next: CourtCardNextMatch | null = match
    ? {
        skippedReason: skipped ?? undefined,
        position: waiting.indexOf(match) + 1,
        formatLabel: FORMAT_LABELS[match.format],
        teamA: match.teamA.map((id) => playerOf(id).shortName),
        teamB: match.teamB.map((id) => playerOf(id).shortName),
      }
    : null
  return {
    next,
    blockedReason: !match && first ? matchStatus(first, ctx).reason : undefined,
    onPickAnother: match && waiting.length > 1 ? fn() : undefined,
  }
}

function free(
  court: SessionCourt,
  list: Match[],
  overrides: Partial<CourtCardFreeProps> = {},
): CourtCardFreeProps {
  return {
    variant: 'free',
    label: court.label,
    untilLabel: untilOf(court),
    bookingEnded: Date.now() >= (court.openUntil ?? session.scheduledEndAt),
    onRemove: fn(),
    onReviewAndStart: fn(),
    onAddMatch: fn(),
    ...nextFor(court, list),
    ...overrides,
  }
}

const meta = {
  title: 'Queue/CourtCard',
  component: CourtCard,
  decorators: [
    (Story) => (
      <div className="w-full max-w-[300px]">
        <Story />
      </div>
    ),
  ],
  args: inGame(playing),
} satisfies Meta<CourtCardProps>

export default meta
type Story = StoryObj<CourtCardProps>

export const DoublesInGame: Story = {}
export const OneVersusTwoInGame: Story = {
  args: inGame({
    ...playing,
    format: 'fun_1v2',
    teamA: playing.teamA.slice(0, 1),
  }),
}
export const MergedFiveVersusFive: Story = { args: inGame(merged) }
export const WithSubstitutions: Story = {
  args: inGame({ ...playing, substitutions: withSubs.substitutions }),
}
export const FreeWithNextEligible: Story = { args: free(courtAt(1), [ready, absent]) }
export const FreeWithSkippedFirst: Story = { args: free(courtAt(1), [playing, blocked, ready]) }
export const FreeNoneReady: Story = { args: free(courtAt(1), [playing, blocked]) }
export const QueueEmpty: Story = { args: free(courtAt(1), [playing]) }
export const BookingEnded: Story = { args: free(courtAt(2), [playing, blocked, ready]) }
export const LastCourt: Story = { args: free(courtAt(0), [], { isLastCourt: true }) }
export const LongNames: Story = {
  args: inGame(playing, {
    label: 'Covered Court 1 (the far one)',
    teamA: playing.teamA.map((id, i) =>
      i === 0
        ? {
            ...playerOf(id),
            shortName: 'Maria Consolacion',
            name: 'Maria Consolacion Dela Cruz Villareal',
          }
        : playerOf(id),
    ),
  }),
}

/** The Courts grid as the console lays it out, with the Add court tile last. */
const gridDecorator: Decorator = (Story) => (
  <div className="w-full max-w-5xl">
    <Story />
  </div>
)

export const CourtsGrid: Story = {
  decorators: [gridDecorator],
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-3">
      <CourtCard {...inGame(playing)} />
      <CourtCard {...free(courtAt(1), [playing, blocked, ready])} />
      <CourtCard {...free(courtAt(2), [playing, blocked, ready])} />
      <AddCourtTile nextNumber={courts.length + 1} onAdd={fn()} />
    </div>
  ),
}
export const CourtsGridMerged: Story = {
  decorators: [gridDecorator],
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-3">
      <CourtCard {...inGame(merged)} />
      <CourtCard {...free(courtAt(2), [merged, blocked, ready])} />
      <AddCourtTile nextNumber={courts.length + 1} onAdd={fn()} />
    </div>
  ),
}
export const Phone: Story = { ...CourtsGrid, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { ...CourtsGrid, globals: { viewport: { value: 'desktop' } } }
