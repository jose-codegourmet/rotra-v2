import { clubs } from '@rotra/data/fixtures/clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ClubIdentityPanel } from './ClubIdentityPanel'

const club = clubs[0]
if (!club) throw new Error('Club fixtures missing')

// The Admin prototype's pending request for this club ("Lahug Smashers", sent 19 hours ago).
const sentAt = new Date(Date.now() - 19 * 3600e3).toISOString()

const meta = {
  title: 'Queue/ClubIdentityPanel',
  component: ClubIdentityPanel,
  decorators: [
    (Story) => (
      <div className="max-w-[820px]">
        <Story />
      </div>
    ),
  ],
  args: {
    clubName: club.name,
    initials: club.initials,
    foundingAddress: club.foundingAddress,
    cityCode: club.locationCode,
    onLogoChange: fn(),
    onLogoRemove: fn(),
    onError: fn(),
    onRequestNameChange: fn(),
    onCancelRequest: fn(),
  },
} satisfies Meta<typeof ClubIdentityPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Initials: Story = {}
export const WithLogo: Story = {
  args: {
    logoUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64"/></svg>',
  },
}
export const PendingRequest: Story = {
  args: { pendingRequest: { name: 'Lahug Smashers', sentAt } },
}
export const Offline: Story = { args: { offline: true } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
