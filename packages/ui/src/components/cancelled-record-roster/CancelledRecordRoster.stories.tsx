import type { Meta, StoryObj } from '@storybook/react-vite'
import { CancelledRecordRoster } from './CancelledRecordRoster'

const meta = {
  title: 'Queue/CancelledRecordRoster',
  component: CancelledRecordRoster,
  args: {
    roster: [
      { id: 'a', name: 'Mika Reyes', levelLabel: 'Intermediate Mid', paidLabel: 'Paid ₱150' },
      { id: 'b', name: 'Jon Cruz', levelLabel: 'Beginner High', paidLabel: 'Not paid' },
    ],
    waitlist: [{ id: 'w', name: 'Ana Lim' }],
  },
} satisfies Meta<typeof CancelledRecordRoster>

export default meta
type Story = StoryObj<typeof meta>

export const WithWaitlist: Story = { name: 'With waitlist' }
export const NobodyJoined: Story = { name: 'Nobody joined', args: { roster: [], waitlist: [] } }
