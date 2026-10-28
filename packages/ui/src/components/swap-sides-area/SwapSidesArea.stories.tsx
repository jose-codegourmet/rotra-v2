import type { MatchCardFixture } from '@rotra/data/fixtures/match-cards'
import { type LineupSlotsFixture, queueGridFixtures } from '@rotra/data/fixtures/queue-grid'
import { cn } from '@rotra/ui/cn'
import { MatchCard, type MatchCardPlayer } from '@rotra/ui/match-card'
import { SwappablePlayer } from '@rotra/ui/swap-sides-area/swappable-player'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { SwapSidesArea, type SwapSidesAreaProps, type SwapSlot } from './SwapSidesArea'

type Side = 'A' | 'B'

function swapped<T>(
  teams: { teamA: T[]; teamB: T[] },
  from: SwapSlot,
  to: SwapSlot,
  allowEmpty: boolean,
) {
  const teamA = [...teams.teamA],
    teamB = [...teams.teamB]
  const side = (t: Side) => (t === 'A' ? teamA : teamB)
  const a = side(from.team)[from.index],
    b = side(to.team)[to.index]
  if (a === undefined || (b === undefined && !allowEmpty)) return teams
  side(from.team)[from.index] = b as T
  side(to.team)[to.index] = a
  return { teamA, teamB }
}

/** A queue card whose players switch sides locally, so the behaviour can be tried in Storybook. */
function SwappableCard({
  fixture,
  onSwap,
}: {
  fixture: MatchCardFixture
  onSwap: SwapSidesAreaProps['onSwap']
}) {
  const [teams, setTeams] = useState<{ teamA: MatchCardPlayer[]; teamB: MatchCardPlayer[] }>({
    teamA: fixture.teamA,
    teamB: fixture.teamB,
  })
  return (
    <SwapSidesArea
      onSwap={(from, to) => {
        onSwap(from, to)
        setTeams((t) => swapped(t, from, to, false))
      }}
    >
      <MatchCard
        position={fixture.match.queuePosition}
        matchNo={fixture.match.matchNo}
        format={fixture.match.format}
        origin={fixture.match.origin}
        manualProtected={fixture.match.manualProtected}
        status={fixture.status}
        teamA={teams.teamA}
        teamB={teams.teamB}
        flow="right"
        swappable
        onSelectPlayer={fn()}
        onStart={fn()}
        onEdit={fn()}
        onRemove={fn()}
      />
    </SwapSidesArea>
  )
}

/** The lineup editor's slot rows (the prototype's .slot-btn): a player, or an empty slot that accepts a drop. */
function LineupSlots({
  fixture,
  onSwap,
}: {
  fixture: LineupSlotsFixture
  onSwap: SwapSidesAreaProps['onSwap']
}) {
  const [slots, setSlots] = useState(fixture)
  const row = (team: Side, players: LineupSlotsFixture['teamA']) => (
    <div className="flex flex-col gap-1.5">
      <div className="text-[13px] font-bold text-fg2">Team {team}</div>
      {players.map((p, i) => (
        <SwappablePlayer
          key={p ? p.id : `${team}-empty-${i}`}
          team={team}
          index={i}
          empty={!p}
          className="flex-1"
        >
          <button
            type="button"
            onClick={fn()}
            aria-label={
              p
                ? `Team ${team} player ${i + 1}: ${p.name}. Change. Left or right arrow switches sides`
                : `Choose Team ${team} player ${i + 1}`
            }
            className={cn(
              'flex min-h-14 flex-1 items-center gap-2.5 rounded-md border border-border-strong bg-bg px-2.5 py-2 text-left text-fg hover:border-accent',
              !p && 'justify-center border-dashed font-semibold text-fg2',
            )}
          >
            {p ? (
              <>
                <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                <span className="text-[13px] text-fg2">Change</span>
              </>
            ) : (
              '+ Choose player'
            )}
          </button>
        </SwappablePlayer>
      ))}
    </div>
  )
  return (
    <SwapSidesArea
      allowEmptyTargets
      onSwap={(from, to) => {
        onSwap(from, to)
        setSlots((s) => swapped(s, from, to, true))
      }}
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-fg2">
          Drag a player onto a slot on the other team to switch sides.
        </p>
        {row('A', slots.teamA)}
        <div className="text-center text-[11px] font-extrabold tracking-[1px] text-fg3">VS</div>
        {row('B', slots.teamB)}
      </div>
    </SwapSidesArea>
  )
}

const meta = {
  title: 'Queue/SwapSidesArea',
  component: SwapSidesArea,
  args: { onSwap: fn(), children: null },
  decorators: [
    (Story) => (
      <div className="w-[236px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SwapSidesArea>

export default meta
type Story = StoryObj<typeof meta>

export const DoublesCard: Story = {
  name: 'Swap on a doubles card',
  render: (args) => <SwappableCard fixture={queueGridFixtures.doubles} onSwap={args.onSwap} />,
}

export const OneVsTwo: Story = {
  name: 'Swap in a 1v2 (sizes stay)',
  render: (args) => <SwappableCard fixture={queueGridFixtures.oneVsTwo} onSwap={args.onSwap} />,
}

export const EmptySlot: Story = {
  name: 'Swap onto an empty slot (lineup editor mode)',
  args: { allowEmptyTargets: true },
  decorators: [
    (Story) => (
      <div className="w-[343px]">
        <Story />
      </div>
    ),
  ],
  render: (args) => <LineupSlots fixture={queueGridFixtures.lineupSlots} onSwap={args.onSwap} />,
}

export const Phone: Story = {
  decorators: [
    (Story) => (
      <div className="w-[343px]">
        <Story />
      </div>
    ),
  ],
  render: (args) => <SwappableCard fixture={queueGridFixtures.doubles} onSwap={args.onSwap} />,
  globals: { viewport: { value: 'phone' } },
}

export const Desktop: Story = {
  render: (args) => <SwappableCard fixture={queueGridFixtures.doubles} onSwap={args.onSwap} />,
  globals: { viewport: { value: 'desktop' } },
}
