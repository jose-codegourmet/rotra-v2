import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CancelSessionSheet } from './CancelSessionSheet'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')

const meta = {
  title: 'Queue/CancelSessionSheet',
  component: CancelSessionSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    title: tonight.title,
    whenLabel: 'Sat, Nov 7 · 6:00–9:00 PM',
    joinedCount: 6,
    waitlistCount: 1,
    paidCount: 0,
    onConfirm: fn(),
  },
} satisfies Meta<typeof CancelSessionSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Unpaid: Story = {}
export const Paid: Story = { args: { paidCount: 3 } }
export const PaidOnePlayer: Story = { args: { paidCount: 1, joinedCount: 1, waitlistCount: 0 } }
export const Pending: Story = { args: { isPending: true } }
export const Refused: Story = {
  args: { error: 'This session has already started, so it was not cancelled.' },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const PaidPhone: Story = {
  args: { paidCount: 3 },
  globals: { viewport: { value: 'phone' } },
}
