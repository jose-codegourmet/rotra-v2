import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { OverdueBanner } from './OverdueBanner'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const { session } = consoleSessionFixture
const end = session.scheduledEndAt

const meta = {
  title: 'Queue/OverdueBanner',
  component: OverdueBanner,
  args: {
    endsAt: end,
    now: end + 15 * MINUTE,
    onSetEndTime: fn(),
    onSessionDone: fn(),
  },
} satisfies Meta<typeof OverdueBanner>

export default meta
type Story = StoryObj<typeof meta>

/** "Planned end passed 15 min ago." */
export const Overdue: Story = {}

/** "Planned end passed 1 h ago." (whole hours, rounded down) */
export const LongOverdue: Story = { args: { now: end + HOUR + 20 * MINUTE } }

/** "Planned end passed 45 min ago." */
export const Overdue45Min: Story = { args: { now: end + 45 * MINUTE } }

/** "Planned end passed 2 h ago." */
export const Overdue2Hours: Story = { args: { now: end + 2 * HOUR } }

/** "Planned end passed long time ago." (from 24 h) */
export const Overdue30Hours: Story = { args: { now: end + 30 * HOUR } }

/** Session done needs internet. */
export const Offline: Story = { args: { offline: true } }

/** Before the planned end the banner renders nothing. */
export const BeforePlannedEnd: Story = { args: { now: end - 30 * MINUTE } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
