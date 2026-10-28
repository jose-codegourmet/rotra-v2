import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { DeleteSessionSheet } from './DeleteSessionSheet'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')

const meta = {
  title: 'Queue/DeleteSessionSheet',
  component: DeleteSessionSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    title: tonight.title,
    whenLabel: 'Thu, Oct 28 · 7:00 PM–10:00 PM',
    venueName: tonight.venueName,
    confirmedCount: 0,
    waitlistCount: 0,
    pendingRequestCount: 2,
    onConfirm: fn(),
    onOpenRoster: fn(),
  },
} satisfies Meta<typeof DeleteSessionSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Deletable: Story = {}
export const Blocked: Story = { args: { confirmedCount: 14, waitlistCount: 2 } }
export const BlockedOnePlayer: Story = { args: { confirmedCount: 1 } }
export const Offline: Story = { args: { offline: true } }
export const Pending: Story = { args: { isPending: true } }
export const Refused: Story = {
  args: { error: '1 player is confirmed. Remove them from the roster first.' },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const BlockedPhone: Story = {
  args: { confirmedCount: 14 },
  globals: { viewport: { value: 'phone' } },
}
