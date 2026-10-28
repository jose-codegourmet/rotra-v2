import { liveStandingsFixture } from '@rotra/data/fixtures/live-standings'
import { sessionRecordFixture } from '@rotra/data/fixtures/session-record'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { LiveLeaderboard, type LiveLeaderboardProps } from './LiveLeaderboard'

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
} satisfies Meta<LiveLeaderboardProps>

export default meta
type Story = StoryObj<LiveLeaderboardProps>

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

/** The official standings of Thursday Open Play on the session record's Results tab. */
export const Record: Story = {
  args: { variant: 'record', rows: sessionRecordFixture.standings },
}

export const RecordEmpty: Story = { args: { variant: 'record', rows: [] } }

export const RecordPhone: Story = {
  args: { variant: 'record', rows: sessionRecordFixture.standings },
  globals: { viewport: { value: 'phone' } },
}
