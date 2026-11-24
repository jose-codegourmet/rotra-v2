import { joinRequests } from '@rotra/data/fixtures/joinRequests'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { WhoCanJoinCard } from '@rotra/ui/who-can-join-card'
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
      <div className="max-w-4xl">
        <Story />
      </div>
    ),
  ],
  args: {
    link,
    pendingCount: 0,
    onCopyLink: fn(),
    onOpenAsGuest: fn(),
    onPreviewPublicPage: fn(),
  },
} satisfies Meta<typeof SessionLinkCard>

export default meta
type Story = StoryObj<typeof meta>

/** The Session link box alone. */
export const Default: Story = {}
export const WithPendingRequests: Story = { args: { pendingCount: pending } }
export const OnePendingRequest: Story = { args: { pendingCount: 1 } }
export const Light: Story = { args: { pendingCount: pending }, globals: { theme: 'light' } }

const split: Story['decorators'] = [
  (_Story, { args }) => (
    <div className="grid items-stretch gap-3 sm:grid-cols-2">
      <SessionLinkCard {...args} />
      <WhoCanJoinCard
        acceptJoinRequests={tonight.acceptJoinRequests}
        alwaysRequireRequest={tonight.alwaysRequireRequest ?? false}
        onAcceptJoinRequestsChange={fn()}
        onAlwaysRequireRequestChange={fn()}
      />
    </div>
  ),
]
/** The split: Session link | Who can join, side by side; stacked on phones. */
export const SplitDesktop: Story = {
  args: { pendingCount: pending },
  decorators: split,
  globals: { viewport: { value: 'desktop' } },
}
export const SplitLight: Story = {
  args: { pendingCount: pending },
  decorators: split,
  globals: { theme: 'light', viewport: { value: 'desktop' } },
}
export const SplitPhone: Story = {
  args: { pendingCount: pending },
  decorators: split,
  globals: { viewport: { value: 'phone' } },
}
