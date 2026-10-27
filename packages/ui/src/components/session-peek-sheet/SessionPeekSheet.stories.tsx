import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SessionPeekSheet } from './SessionPeekSheet'

const [tonight, , , invalid] = queueSessionFixtures.sessions
if (!tonight || !invalid) throw new Error('Session fixtures missing')

const meta = {
  title: 'Queue/SessionPeekSheet',
  component: SessionPeekSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    title: tonight.title,
    state: 'prepared',
    startsAt: tonight.scheduledStartAt,
    endsAt: tonight.scheduledEndAt,
    venueName: tonight.venueName,
    courts: 3,
    rosterCount: 14,
    fromSetup: true,
    onOpen: fn(),
  },
} satisfies Meta<typeof SessionPeekSheet>

export default meta
type Story = StoryObj<typeof meta>

export const PreparedFromSetup: Story = {}
export const LiveFromSetup: Story = { args: { state: 'live' } }
export const CompletedElsewhere: Story = { args: { state: 'completed', fromSetup: false } }
export const InvalidElsewhere: Story = {
  args: { state: 'invalid', fromSetup: false, title: invalid.title, venueName: invalid.venueName },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
