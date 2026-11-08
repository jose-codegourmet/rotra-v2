import type { MatchCardFixture } from '@rotra/data/fixtures/match-cards'
import { matchCardFixtures } from '@rotra/data/fixtures/match-cards'
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
const draftChips = (c: MatchCardFixture) =>
  Object.fromEntries(
    [...c.teamA, ...c.teamB].map((p, i) => [
      p.id,
      [{ text: `${i + 1} played` }, ...(i === 0 ? [{ text: '1 queued' }] : [])],
    ]),
  )
/** An Auto Queue draft: the same tile, a Draft chip for #position, no handle or actions. */
export const Draft: Story = {
  args: {
    ...propsFor(matchCardFixtures.ready),
    status: draftStatus,
    draft: { selected: false, onToggle: fn(), playerChips: draftChips(matchCardFixtures.ready) },
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
      playerChips: draftChips(matchCardFixtures.ready),
    },
  },
}
/** Plan Ahead: a player is mid-game, so the draft waits; their chip reads Playing now. */
export const DraftPlayingNow: Story = {
  args: {
    ...propsFor(matchCardFixtures.ready),
    status: {
      kind: 'blocked',
      reason: 'A player is playing now; this match waits until they are free.',
    },
    draft: {
      selected: false,
      onToggle: fn(),
      playerChips: {
        ...draftChips(matchCardFixtures.ready),
        [matchCardFixtures.ready.teamA[0]?.id ?? '']: [
          { text: '2 played' },
          { text: 'Playing now', tone: 'warn' },
        ],
      },
    },
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
