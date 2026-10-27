import type { MatchCardFixture } from '@rotra/data/fixtures/match-cards'
import { queueGridFixtures } from '@rotra/data/fixtures/queue-grid'
import type { SwapSlot } from '@rotra/ui/swap-sides-area'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { QueueGrid, type QueueGridMatch, type QueueGridProps } from './QueueGrid'

const matchFor = (c: MatchCardFixture): QueueGridMatch => ({
  id: c.match.id,
  matchNo: c.match.matchNo,
  format: c.match.format,
  origin: c.match.origin,
  manualProtected: c.match.manualProtected,
  status: c.status,
  teamA: c.teamA,
  teamB: c.teamB,
  onSelectPlayer: fn(),
  onStart: fn(),
  onEdit: fn(),
  onRemove: fn(),
})

const waiting = queueGridFixtures.waiting.map(matchFor)

const widthFor: Record<number, string> = {
  1: 'w-[343px]',
  2: 'w-[600px]',
  3: 'w-[860px]',
  4: 'w-[1100px]',
  5: 'w-[1232px]',
}

/** Applies moves and swaps locally so the keyboard and drag paths can be tried in Storybook. */
function LiveQueueGrid(props: QueueGridProps) {
  const [matches, setMatches] = useState(props.matches)
  const onMove = (matchId: string, toIndex: number) => {
    props.onMove(matchId, toIndex)
    setMatches((list) => {
      const from = list.findIndex((m) => m.id === matchId)
      if (from < 0 || from === toIndex) return list
      const next = [...list]
      const [item] = next.splice(from, 1)
      if (item) next.splice(toIndex, 0, item)
      return next
    })
  }
  const onSwapSides = (matchId: string, from: SwapSlot, to: SwapSlot) => {
    props.onSwapSides?.(matchId, from, to)
    setMatches((list) =>
      list.map((m) => {
        if (m.id !== matchId) return m
        const teamA = [...m.teamA],
          teamB = [...m.teamB]
        const side = (t: 'A' | 'B') => (t === 'A' ? teamA : teamB)
        const a = side(from.team)[from.index],
          b = side(to.team)[to.index]
        if (!a || !b) return m
        side(from.team)[from.index] = b
        side(to.team)[to.index] = a
        return { ...m, teamA, teamB }
      }),
    )
  }
  return (
    <QueueGrid
      {...props}
      matches={matches}
      onMove={onMove}
      onSwapSides={props.onSwapSides ? onSwapSides : undefined}
    />
  )
}

const meta = {
  title: 'Queue/QueueGrid',
  component: QueueGrid,
  args: { matches: waiting, onMove: fn(), onSwapSides: fn(), columns: 3 },
  decorators: [
    (Story, { args }) => (
      <div className={(args.columns && widthFor[args.columns]) || 'w-full'}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QueueGrid>

export default meta
type Story = StoryObj<typeof meta>

export const OneColumn: Story = { args: { columns: 1 } }
export const TwoColumns: Story = { args: { columns: 2 } }
export const ThreeColumns: Story = { args: { columns: 3 } }
export const FourColumns: Story = { args: { columns: 4 } }
export const FiveColumns: Story = { args: { columns: 5 } }

export const ByWindowWidth: Story = {
  name: 'Columns from the window width',
  args: { columns: undefined },
}

export const ReorderByKeyboard: Story = {
  name: 'Reorder by keyboard (focus a ⠿ handle, then arrow keys)',
  render: (args) => <LiveQueueGrid {...args} />,
}

export const ReorderByDrag: Story = {
  name: 'Reorder by drag (mouse or touch on ⠿)',
  render: (args) => <LiveQueueGrid {...args} />,
}

export const SwitchSides: Story = {
  name: 'Switch sides (drag a player across, or ← / →)',
  render: (args) => <LiveQueueGrid {...args} />,
}

export const WithoutSwitchSides: Story = { args: { onSwapSides: undefined } }

export const Phone: Story = {
  args: { columns: 1, matches: waiting.slice(0, 4) },
  render: (args) => <LiveQueueGrid {...args} />,
  globals: { viewport: { value: 'phone' } },
}

export const Desktop: Story = {
  args: { columns: 5 },
  render: (args) => <LiveQueueGrid {...args} />,
  globals: { viewport: { value: 'desktop' } },
}
