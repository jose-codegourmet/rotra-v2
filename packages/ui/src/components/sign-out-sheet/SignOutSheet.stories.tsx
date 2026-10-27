import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SignOutSheet } from './SignOutSheet'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')

const meta = {
  title: 'Queue/SignOutSheet',
  component: SignOutSheet,
  args: { open: true, onOpenChange: fn(), onSignOut: fn() },
} satisfies Meta<typeof SignOutSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Plain: Story = {}
export const OneUnsyncedChange: Story = { args: { pendingCount: 1 } }
export const AllNotices: Story = {
  args: { pendingCount: 3, liveSessionTitle: tonight.title, offline: true },
}
export const Pending: Story = { args: { isPending: true } }
export const Phone: Story = {
  args: { pendingCount: 3, liveSessionTitle: tonight.title },
  globals: { viewport: { value: 'phone' } },
}
