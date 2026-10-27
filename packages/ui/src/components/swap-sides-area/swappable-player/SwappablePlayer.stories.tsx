import { queueGridFixtures } from '@rotra/data/fixtures/queue-grid'
import { PlayerFaceButton } from '@rotra/ui/player-face-button'
import { SwapSidesArea, type SwapSlot } from '@rotra/ui/swap-sides-area'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { SwappablePlayer, type SwappablePlayerProps } from './SwappablePlayer'

const doubles = queueGridFixtures.doubles
const first = doubles.teamA[0]
if (!first) throw new Error('Missing match card fixture.')

/** Two teams of faces inside a SwapSidesArea; swaps apply locally so the drag and keys can be tried. */
function TwoTeams({ onSwap }: { onSwap: (from: SwapSlot, to: SwapSlot) => void }) {
  const [teams, setTeams] = useState({ teamA: doubles.teamA, teamB: doubles.teamB })
  const faces = (team: 'A' | 'B', players: typeof doubles.teamA) => (
    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
      {players.map((p, i) => (
        <SwappablePlayer key={p.id} team={team} index={i}>
          <PlayerFaceButton
            name={p.name}
            shortName={p.shortName}
            level={p.level}
            label={`${p.name}, Team ${team}. View profile`}
            size="queue"
            swap={{ team, index: i }}
            onClick={fn()}
          />
        </SwappablePlayer>
      ))}
    </div>
  )
  return (
    <SwapSidesArea
      onSwap={(from, to) => {
        onSwap(from, to)
        setTeams((t) => {
          const teamA = [...t.teamA],
            teamB = [...t.teamB]
          const side = (s: 'A' | 'B') => (s === 'A' ? teamA : teamB)
          const a = side(from.team)[from.index],
            b = side(to.team)[to.index]
          if (!a || !b) return t
          side(from.team)[from.index] = b
          side(to.team)[to.index] = a
          return { teamA, teamB }
        })
      }}
    >
      <div className="flex flex-col gap-1.5 rounded-lg border border-border-strong bg-surface p-2.5">
        {faces('A', teams.teamA)}
        <div className="text-center text-[10px] font-extrabold tracking-[1px] text-fg3">VS</div>
        {faces('B', teams.teamB)}
      </div>
    </SwapSidesArea>
  )
}

const face: SwappablePlayerProps['children'] = (
  <PlayerFaceButton
    name={first.name}
    shortName={first.shortName}
    level={first.level}
    label={`${first.name}, Team A. View profile`}
    size="queue"
    swap={{ team: 'A', index: 0 }}
    onClick={fn()}
  />
)

const meta = {
  title: 'Queue/SwappablePlayer',
  component: SwappablePlayer,
  args: { team: 'A', index: 0, children: face },
  decorators: [
    (Story) => (
      <div className="w-[236px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SwappablePlayer>

export default meta
type Story = StoryObj<typeof meta>

export const InAnArea: Story = {
  name: 'In a SwapSidesArea (drag across, or ← / →)',
  render: () => <TwoTeams onSwap={fn()} />,
}

export const OutsideAnArea: Story = {
  name: 'Outside an area: plain wrapper',
  decorators: [
    (Story) => (
      <div className="inline-grid place-items-center rounded-md bg-surface p-4">
        <Story />
      </div>
    ),
  ],
}

export const EmptySlot: Story = {
  args: { empty: true, children: null },
  render: (args) => (
    <SwapSidesArea allowEmptyTargets onSwap={fn()}>
      <SwappablePlayer {...args}>
        <button
          type="button"
          onClick={fn()}
          aria-label="Choose Team A player 1"
          className="flex min-h-14 flex-1 items-center justify-center rounded-md border border-dashed border-border-strong bg-bg px-2.5 py-2 font-semibold text-fg2 hover:border-accent"
        >
          + Choose player
        </button>
      </SwappablePlayer>
    </SwapSidesArea>
  ),
}

export const Phone: Story = {
  render: () => <TwoTeams onSwap={fn()} />,
  globals: { viewport: { value: 'phone' } },
}

export const Desktop: Story = {
  render: () => <TwoTeams onSwap={fn()} />,
  globals: { viewport: { value: 'desktop' } },
}
