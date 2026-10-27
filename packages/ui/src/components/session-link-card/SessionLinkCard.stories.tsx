import { joinRequests } from '@rotra/data/fixtures/joinRequests'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SessionLinkCard } from './SessionLinkCard'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')
const link = `https://rotra.app/s/${tonight.publicSlug}`
const pending = joinRequests.filter((r) => r.status === 'pending').length

const meta = {
  title: 'Queue/SessionLinkCard',
  component: SessionLinkCard,
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
  args: {
    link,
    pendingCount: 0,
    acceptJoinRequests: tonight.acceptJoinRequests,
    onCopyLink: fn(),
    onOpenAsGuest: fn(),
    onPreviewPublicPage: fn(),
    onAcceptJoinRequestsChange: fn(),
  },
} satisfies Meta<typeof SessionLinkCard>

export default meta
type Story = StoryObj<typeof meta>

export const RequestsOn: Story = {}
export const RequestsOff: Story = { args: { acceptJoinRequests: false } }
export const WithPendingRequests: Story = { args: { pendingCount: pending } }
export const OnePendingRequest: Story = { args: { pendingCount: 1 } }
export const Phone: Story = {
  args: { pendingCount: pending },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = {
  args: { pendingCount: pending },
  globals: { viewport: { value: 'desktop' } },
}
