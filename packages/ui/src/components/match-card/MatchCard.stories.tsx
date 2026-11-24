import type { MatchCardFixture } from '@rotra/data/fixtures/match-cards'
import { matchCardFixtures } from '@rotra/data/fixtures/match-cards'
import type { PlayingLevel } from '@rotra/data/player/types'
import type { PlayerWait } from '@rotra/ui/player-face-button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { MatchCard, type MatchCardProps } from './MatchCard'

const propsFor = (c: MatchCardFixture): MatchCardProps => ({
  position: c.match.queuePosition,
  matchNo: c.match.matchNo,
  format: c.match.format,
  origin: c.match.origin,
  manualProtected: c.match.manualProtected,
  status: c.status,
  teamA: c.teamA,
  teamB: c.teamB,
  flow: 'right',
  onSelectPlayer: fn(),
  onOpenGames: fn(),
  onStart: fn(),
  onEdit: fn(),
  onRemove: fn(),
})

const meta = {
  title: 'Queue/MatchCard',
  component: MatchCard,
  decorators: [
    (Story) => (
      <div className="w-[220px]">
        <Story />
      </div>
    ),
  ],
  args: propsFor(matchCardFixtures.ready),
} satisfies Meta<typeof MatchCard>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}
export const NeedsAttention: Story = { args: propsFor(matchCardFixtures.needsAttention) }
export const Blocked: Story = { args: propsFor(matchCardFixtures.blocked) }
export const WaitingForCourts: Story = {
  name: '5v5 needs two free courts',
  args: propsFor(matchCardFixtures.waitingForCourts),
}
/** A court is not open yet: Start stays enabled and the Start match sheet offers Start anyway */
export const WaitingForCourtsCanOpenCourt: Story = {
  args: { ...propsFor(matchCardFixtures.waitingForCourts), canOpenCourt: true },
}
export const ProtectedManual: Story = { args: propsFor(matchCardFixtures.protectedManual) }
export const Suggested: Story = { args: propsFor(matchCardFixtures.suggested) }
export const Auto: Story = { args: propsFor(matchCardFixtures.auto) }
export const LongNames: Story = { args: propsFor(matchCardFixtures.longNames) }

const withWait = (c: MatchCardFixture, wait: PlayerWait): MatchCardProps => {
  const base = propsFor(c)
  return {
    ...base,
    teamA: base.teamA.map((p) => ({ ...p, wait })),
    teamB: base.teamB.map((p) => ({ ...p, wait })),
  }
}

export const Wait3Min: Story = {
  name: '3 min wait',
  args: withWait(matchCardFixtures.ready, { kind: 'minutes', minutes: 3 }),
}
export const Wait12Min: Story = {
  name: '12 min wait',
  args: withWait(matchCardFixtures.ready, { kind: 'minutes', minutes: 12 }),
}
export const Wait17Min: Story = {
  name: '17 min wait',
  args: withWait(matchCardFixtures.ready, { kind: 'minutes', minutes: 17 }),
}
export const Wait45Min: Story = {
  name: '45 min wait',
  args: withWait(matchCardFixtures.ready, { kind: 'minutes', minutes: 45 }),
}
export const Wait2Hours: Story = {
  name: '2 h wait',
  args: withWait(matchCardFixtures.ready, { kind: 'minutes', minutes: 120 }),
}
export const Wait30Hours: Story = {
  name: 'long time ago wait',
  args: withWait(matchCardFixtures.ready, { kind: 'minutes', minutes: 30 * 60 }),
}
export const WaitOnCourt: Story = {
  args: withWait(matchCardFixtures.ready, { kind: 'on-court' }),
}
export const WaitPlaying: Story = {
  args: withWait(matchCardFixtures.blocked, { kind: 'playing' }),
}
export const WaitNotHere: Story = {
  args: withWait(matchCardFixtures.needsAttention, { kind: 'not-here' }),
}
export const MixedWaits: Story = {
  args: (() => {
    const base = propsFor(matchCardFixtures.ready)
    const waitsA: PlayerWait[] = [
      { kind: 'minutes', minutes: 3 },
      { kind: 'minutes', minutes: 12 },
    ]
    const waitsB: PlayerWait[] = [{ kind: 'minutes', minutes: 17 }, { kind: 'playing' }]
    return {
      ...base,
      teamA: base.teamA.map((p, i) => ({ ...p, wait: waitsA[i] ?? p.wait })),
      teamB: base.teamB.map((p, i) => ({ ...p, wait: waitsB[i] ?? p.wait })),
    }
  })(),
}
const draftStatus = {
  kind: 'blocked' as const,
  reason: 'Available players with the lowest planned load',
}
/** An Auto Queue draft: the same tile, a Draft chip for #position, no handle or actions. */
export const Draft: Story = {
  args: {
    ...propsFor(matchCardFixtures.ready),
    status: draftStatus,
    draft: { selected: false, onToggle: fn(), },
  },
}
export const DraftSelected: Story = {
  args: {
    ...propsFor(matchCardFixtures.ready),
    status: draftStatus,
    draft: {
      selected: true,
      pickOrder: 2,
      onToggle: fn(),
    },
  },
}
/** Plan Ahead: a player is mid-game, so the draft waits; the status line says so (no chip). */
export const DraftPlayingNow: Story = {
  args: {
    ...propsFor(matchCardFixtures.ready),
    status: {
      kind: 'blocked',
      reason: 'A player is playing now; this match waits until they are free.',
    },
    draft: { selected: false, onToggle: fn() },
  },
}
/** A draft with a player who left: keeps its warn border and warning line. */
export const DraftAttention: Story = {
  args: {
    ...propsFor(matchCardFixtures.ready),
    status: { kind: 'needs-attention', reason: 'A player is no longer present. Generate again.' },
    draft: { selected: false, onToggle: fn() },
  },
}
export const LastInQueue: Story = { args: { flow: null } }
export const FlowDown: Story = { args: { flow: 'down' } }
export const NoActions: Story = {
  args: { onStart: undefined, onEdit: undefined, onRemove: undefined },
}

export const Phone: Story = {
  decorators: [
    (Story) => (
      <div className="w-[343px]">
        <Story />
      </div>
    ),
  ],
  args: propsFor(matchCardFixtures.needsAttention),
  globals: { viewport: { value: 'phone' } },
}

export const Desktop: Story = {
  decorators: [
    (Story) => (
      <div className="grid w-[1232px] grid-cols-5 gap-2.5">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      {matchCardFixtures.upcoming.slice(0, 5).map((c, i, all) => (
        <MatchCard key={c.match.id} {...propsFor(c)} flow={i === all.length - 1 ? null : 'right'} />
      ))}
    </>
  ),
  globals: { viewport: { value: 'desktop' } },
}

/** Same queue tile with static faces and no operator controls; both themes via toolbar. */
export const PlayerReadOnly: Story = { args: { readOnly: true } }

const LEVELS: PlayingLevel[] = [
  'beginner_low',
  'intermediate_mid',
  'advanced_high',
]

/** Games 0, 3, 12 and 25 on faces in each band and with no level; the badge opens the games. */
const withRings = (c: MatchCardFixture): MatchCardProps => {
  const base = propsFor(c)
  const levels: (PlayingLevel | null)[] = [...LEVELS, null]
  const games = [0, 3, 12, 25]
  const all = [...base.teamA, ...base.teamB]
  const dress = (p: MatchCardProps['teamA'][number], i: number) => ({
    ...p,
    level: levels[i % levels.length] ?? null,
    games: games[i % games.length],
  })
  return {
    ...base,
    teamA: base.teamA.map((p) => dress(p, all.indexOf(p))),
    teamB: base.teamB.map((p) => dress(p, all.indexOf(p))),
  }
}
export const RingsAndGames: Story = { args: withRings(matchCardFixtures.ready) }
export const RingsAndGamesWaiting: Story = { args: withRings(matchCardFixtures.blocked) }
export const RingsAndGamesAttention: Story = { args: withRings(matchCardFixtures.needsAttention) }
export const RingsAndGamesDraft: Story = {
  args: {
    ...withRings(matchCardFixtures.ready),
    status: draftStatus,
    draft: { selected: false, onToggle: fn() },
  },
}
/** Faces inside another dialog: the badge is display only. */
export const GamesBadgeStatic: Story = {
  args: { ...withRings(matchCardFixtures.ready), gamesBadge: 'static', onOpenGames: undefined },
}
export const CategoryMixedDoubles: Story = {
  args: { ...withRings(matchCardFixtures.ready), categoryPrefix: 'Mixed' },
}
export const CategoryGenderless3v3: Story = {
  args: { ...propsFor(matchCardFixtures.waitingForCourts), categoryPrefix: 'Genderless' },
}
/** A ready card next to a waiting card. */
export const ReadyNextToWaiting: Story = {
  decorators: [
    (Story) => (
      <div className="grid w-[460px] grid-cols-2 gap-2.5">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <MatchCard {...withRings(matchCardFixtures.ready)} />
      <MatchCard {...withRings(matchCardFixtures.blocked)} />
    </>
  ),
}
/** A search hit that is ready. */
export const ReadySearchHit: Story = {
  args: { ...withRings(matchCardFixtures.ready), searchState: 'hit' },
}
