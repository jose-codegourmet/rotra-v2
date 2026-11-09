import {
  consoleSessionFixture,
  courtWindowFixture,
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
import { expect, fn, userEvent, within } from 'storybook/test'
import {
  CourtCard,
  type CourtCardFreeProps,
  type CourtCardInGameProps,
  type CourtCardNextMatch,
  type CourtCardOnCourtProps,
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
    onEdit: fn(),
    onRemove: fn(),
    ...overrides,
  }
}

/** Getting ready: the match is On court, placed but not started (no minutes until Start match). */
function onCourt(m: Match, overrides: Partial<CourtCardOnCourtProps> = {}): CourtCardOnCourtProps {
  const isMerged = m.courtIds.length > 1
  return {
    variant: 'on-court',
    label: isMerged ? courtNames(m, courts) : courtAt(1).label,
    untilLabel: untilOf(courtAt(1)),
    merged: isMerged,
    teamA: m.teamA.map(playerOf),
    teamB: m.teamB.map(playerOf),
    onOpenProfile: fn(),
    formatLabel: FORMAT_LABELS[m.format],
    matchNo: m.matchNo,
    onStartMatch: fn(),
    onOpenMatch: fn(),
    onSwap: fn(),
    swapWith: { position: 1, matchNo: absent.matchNo },
    onEdit: fn(),
    onRemove: fn(),
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
    onEdit: fn(),
    onRemove: fn(),
    onPutOnCourt: fn(),
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

/** Playing: steady accent glow (no pulse), chip Playing, the minutes in the match line */
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
/** Short on players: too few free players for the smallest standard match */
export const NotEnoughFreePlayers: Story = {
  args: free(courtAt(1), [playing, blocked], { notEnoughFreePlayers: true }),
}

/** Getting ready: On court, not started. Normal border, chip Getting ready, Start match + Open match */
export const GettingReady: Story = { args: onCourt(ready) }
/** A player in the On court match is not present: the reason in warn, Start match disabled */
export const GettingReadyPlayerAway: Story = {
  args: onCourt(absent, {
    blockedReason: matchStatus(absent, { roster, matches, courts }).reason,
  }),
}
export const GettingReadyMerged: Story = { args: onCourt(merged) }
export const GettingReadyBookingEnded: Story = {
  args: onCourt(ready, { untilLabel: untilOf(courtAt(2)), bookingEnded: true }),
}
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
      <CourtCard {...onCourt(ready, { swapWith: null })} />
      <CourtCard {...free(courtAt(2), [playing, blocked])} />
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

export const BeforePlannedStart: Story = {
  args: {
    variant: 'free',
    label: courtWindowFixture.courts[3]!.label,
    startLabel: fmtTime(courtWindowFixture.courts[3]!.startsAt),
    untilLabel: fmtTime(courtWindowFixture.session.scheduledEndAt),
    notOpen: true,
    onStartAnyway: fn(),
    onEdit: fn(),
    onRemove: fn(),
  },
}
// The ⋯ list renders in a portal, outside the story's canvas.
const openMenu = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  await userEvent.click(within(canvasElement).getByRole('button', { name: /^More for / }))
  const body = within(canvasElement.ownerDocument.body)
  await expect(body.getByRole('menuitem', { name: 'Edit' })).toHaveFocus()
}
/** A match is on the court: Edit, Undo early open and Remove are disabled with their reasons */
const openBusyMenu = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  await userEvent.click(within(canvasElement).getByRole('button', { name: /^More for / }))
  const body = within(canvasElement.ownerDocument.body)
  await expect(body.getByRole('menuitem', { name: /^Edit/ })).toHaveAttribute('data-disabled')
  await expect(body.getByRole('menuitem', { name: /^Remove/ })).toHaveAttribute('data-disabled')
}
/** After Start anyway: Free, with "Opened early · planned …" and Undo early open in the ⋯ menu */
export const OpenedEarly: Story = {
  args: free(courtWindowFixture.courts[3]!, [ready], {
    label: courtWindowFixture.courts[3]!.label,
    startLabel: fmtTime(courtWindowFixture.courts[3]!.startsAt),
    untilLabel: fmtTime(courtWindowFixture.session.scheduledEndAt),
    bookingEnded: false,
    openedEarly: true,
    onUndoEarlyOpen: fn(),
  }),
  play: openMenu,
}
export const FreeMenuOpen: Story = { args: free(courtAt(2), [playing, ready]), play: openMenu }
export const LastCourtMenuOpen: Story = {
  args: free(courtAt(2), [ready], { isLastCourt: true }),
  play: openMenu,
}
/** Playing on an early-opened court: Edit, Undo early open and Remove wait until the court is free */
export const InGameOpenedEarlyMenu: Story = {
  args: inGame(playing, {
    startLabel: fmtTime(courtWindowFixture.courts[3]!.startsAt),
    openedEarly: true,
    onUndoEarlyOpen: fn(),
  }),
  play: openBusyMenu,
}
/** Getting ready: the ⋯ menu starts with "Swap with #P · Match N" */
export const GettingReadySwapMenu: Story = {
  args: onCourt(ready),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await openBusyMenu({ canvasElement })
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByRole('menuitem', { name: /^Swap with #1 · Match / })).toHaveFocus()
  },
}
/** No other waiting match is ready: Swap is disabled with its reason */
export const GettingReadyNoSwapMenu: Story = {
  args: onCourt(ready, { swapWith: null }),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await openBusyMenu({ canvasElement })
    const body = within(canvasElement.ownerDocument.body)
    await expect(
      body.getByRole('menuitem', {
        name: /^Swap with the queue\s*No other waiting match is ready/,
      }),
    ).toHaveAttribute('data-disabled')
  },
}
export const ManuallyRemoved: Story = {
  args: {
    variant: 'free',
    label: courtWindowFixture.courts[4]!.label,
    startLabel: fmtTime(courtWindowFixture.courts[4]!.startsAt),
    untilLabel: fmtTime(courtWindowFixture.courts[4]!.openUntil!),
    removed: true,
  },
}

export const InGameBookingEnded: Story = { args: { ...inGame(playing), bookingEnded: true } }

// Light theme: every state (the Theme toolbar covers the rest; dark is the default).
export const PlayingLight: Story = { ...DoublesInGame, globals: { theme: 'light' } }
export const PlayingMergedLight: Story = { ...MergedFiveVersusFive, globals: { theme: 'light' } }
export const PlayingBookingEndedLight: Story = {
  ...InGameBookingEnded,
  globals: { theme: 'light' },
}
export const GettingReadyLight: Story = { ...GettingReady, globals: { theme: 'light' } }
export const GettingReadyPlayerAwayLight: Story = {
  ...GettingReadyPlayerAway,
  globals: { theme: 'light' },
}
export const GettingReadyMergedLight: Story = { ...GettingReadyMerged, globals: { theme: 'light' } }
export const GettingReadyBookingEndedLight: Story = {
  ...GettingReadyBookingEnded,
  globals: { theme: 'light' },
}
export const FreeWithNextEligibleLight: Story = {
  ...FreeWithNextEligible,
  globals: { theme: 'light' },
}
export const FreeNoneReadyLight: Story = { ...FreeNoneReady, globals: { theme: 'light' } }
export const QueueEmptyLight: Story = { ...QueueEmpty, globals: { theme: 'light' } }
export const NotEnoughFreePlayersLight: Story = {
  ...NotEnoughFreePlayers,
  globals: { theme: 'light' },
}
export const BookingEndedLight: Story = { ...BookingEnded, globals: { theme: 'light' } }
export const BeforePlannedStartLight: Story = {
  ...BeforePlannedStart,
  globals: { theme: 'light' },
}
export const ManuallyRemovedLight: Story = { ...ManuallyRemoved, globals: { theme: 'light' } }
export const CourtsGridLight: Story = { ...CourtsGrid, globals: { theme: 'light' } }

export const ReadOnlyPlaying: Story = {
  args: {
    variant: 'read-only',
    label: 'Court 1',
    state: 'playing',
    startedLabel: '7:31 PM',
    teamA: playing.teamA.map(playerOf),
    teamB: playing.teamB.map(playerOf),
  },
}
export const ReadOnlyGettingReady: Story = {
  args: {
    variant: 'read-only',
    label: 'Court 2',
    state: 'getting-ready',
    teamA: ready.teamA.map(playerOf),
    teamB: ready.teamB.map(playerOf),
  },
}
export const ReadOnlyFree: Story = {
  args: { variant: 'read-only', label: 'Court 3', state: 'free' },
}
export const ReadOnlyMerged: Story = {
  args: {
    variant: 'read-only',
    label: 'Court 1 + Court 2',
    state: 'playing',
    merged: true,
    startedLabel: '7:31 PM',
    teamA: merged.teamA.map(playerOf),
    teamB: merged.teamB.map(playerOf),
  },
}
