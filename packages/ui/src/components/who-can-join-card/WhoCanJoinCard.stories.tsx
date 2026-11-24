import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { WhoCanJoinCard } from './WhoCanJoinCard'

const meta = {
  title: 'Queue/WhoCanJoinCard',
  component: WhoCanJoinCard,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  args: {
    acceptJoinRequests: true,
    alwaysRequireRequest: false,
    onAcceptJoinRequestsChange: fn(),
    onAlwaysRequireRequestChange: fn(),
  },
} satisfies Meta<typeof WhoCanJoinCard>

export default meta
type Story = StoryObj<typeof meta>

export const RequestsOn: Story = {}
export const RequestsOff: Story = { args: { acceptJoinRequests: false } }
export const AlwaysRequireRequest: Story = { args: { alwaysRequireRequest: true } }
export const AlwaysRequireRequestLight: Story = {
  args: { alwaysRequireRequest: true },
  globals: { theme: 'light' },
}
