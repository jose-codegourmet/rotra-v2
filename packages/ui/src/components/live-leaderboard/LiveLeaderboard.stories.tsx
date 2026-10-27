import { liveStandingsFixture } from '@rotra/data/fixtures/live-standings'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { LiveLeaderboard } from './LiveLeaderboard'

const meta = {
  title: 'Queue/LiveLeaderboard',
  component: LiveLeaderboard,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[1240px]">
        <Story />
      </div>
    ),
  ],
  args: {
    rows: liveStandingsFixture.rows,
    minimumGames: liveStandingsFixture.minimumGames,
    onOpenProfile: fn(),
  },
} satisfies Meta<typeof LiveLeaderboard>

export default meta
type Story = StoryObj<typeof meta>

/** A clear leader, then three players at 2–1 ordered by head-to-head, then a bottom tie by name. */
export const Standings: Story = {}

/** The console fixture as is: three players at 1–0 and four at 0–1. */
export const Ties: Story = { args: { rows: liveStandingsFixture.tiedRows } }

export const Empty: Story = { args: { rows: [] } }

/** One labelled card per row at 375 px. */
export const PhoneCards: Story = { globals: { viewport: { value: 'phone' } } }

export const PhoneEmpty: Story = {
  args: { rows: [] },
  globals: { viewport: { value: 'phone' } },
}

export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
