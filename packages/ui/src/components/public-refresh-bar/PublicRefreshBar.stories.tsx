import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PublicRefreshBar } from './PublicRefreshBar'

const meta = {
  title: 'Queue/PublicSession/PublicRefreshBar',
  component: PublicRefreshBar,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[760px]">
        <Story />
      </div>
    ),
  ],
  args: { updatedLabel: '7:42 PM', hasPendingChanges: false, refreshThrottled: false, onRefresh: fn() },
} satisfies Meta<typeof PublicRefreshBar>

export default meta
type Story = StoryObj<typeof meta>

export const Enabled: Story = {}
/** Tapped less than 10 seconds ago: disabled, tooltip and aria "Refresh again in a few seconds". */
export const Throttled: Story = { args: { refreshThrottled: true } }
export const PendingChanges: Story = { args: { hasPendingChanges: true } }
export const PendingChangesPhone: Story = {
  args: { hasPendingChanges: true },
  globals: { viewport: { value: 'phone' } },
}
export const ThrottledLight: Story = { args: { refreshThrottled: true }, globals: { theme: 'light' } }
export const PendingChangesLight: Story = {
  args: { hasPendingChanges: true },
  globals: { theme: 'light' },
}
