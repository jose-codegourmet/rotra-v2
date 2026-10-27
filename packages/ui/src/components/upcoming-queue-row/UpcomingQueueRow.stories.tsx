import type { MatchCardFixture } from '@rotra/data/fixtures/match-cards'
import { matchCardFixtures } from '@rotra/data/fixtures/match-cards'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { UpcomingQueueRow, type UpcomingQueueMatch } from './UpcomingQueueRow'

const toMatch = (c: MatchCardFixture): UpcomingQueueMatch => ({
  position: c.match.queuePosition,
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

const upcoming = matchCardFixtures.upcoming.map(toMatch)
const attentionCount = matchCardFixtures.upcoming.filter(
  (c) => c.status.kind === 'needs-attention',
).length

const meta = {
  title: 'Queue/UpcomingQueueRow',
  component: UpcomingQueueRow,
  args: { matches: upcoming, attentionCount, onOpenQueue: fn() },
} satisfies Meta<typeof UpcomingQueueRow>

export default meta
type Story = StoryObj<typeof meta>

/** Columns follow the viewport, like the Session view. */
export const Responsive: Story = {}

export const FiveColumns: Story = {
  args: { columns: 5 },
  globals: { viewport: { value: 'desktop' } },
}
export const FourColumns: Story = {
  decorators: [
    (Story) => (
      <div className="w-[960px]">
        <Story />
      </div>
    ),
  ],
  args: { columns: 4 },
  globals: { viewport: { value: 'desktop' } },
}
export const ThreeColumns: Story = {
  decorators: [
    (Story) => (
      <div className="w-[700px]">
        <Story />
      </div>
    ),
  ],
  args: { columns: 3 },
  globals: { viewport: { value: 'desktop' } },
}
export const TwoColumns: Story = {
  decorators: [
    (Story) => (
      <div className="w-[460px]">
        <Story />
      </div>
    ),
  ],
  args: { columns: 2 },
  globals: { viewport: { value: 'desktop' } },
}
export const OneColumn: Story = {
  args: { columns: 1 },
  globals: { viewport: { value: 'phone' } },
}

/** Everything fits in the row, so the tile says "Reorder, add or regenerate". */
export const NothingMore: Story = {
  args: { matches: upcoming.slice(0, 2), attentionCount: 1, columns: 3 },
}

export const NoAttention: Story = {
  args: {
    matches: upcoming.filter((m) => m.status.kind !== 'needs-attention'),
    attentionCount: 0,
    columns: 4,
  },
}

export const Empty: Story = {
  args: { matches: [], attentionCount: 0, columns: 3 },
}

export const EmptyPhone: Story = {
  args: { matches: [], attentionCount: 0, columns: 1 },
  globals: { viewport: { value: 'phone' } },
}
