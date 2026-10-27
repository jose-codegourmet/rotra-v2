import { Button } from '@rotra/ui/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Notice } from './Notice'

const meta = {
  title: 'Shared/States/Notice',
  component: Notice,
  args: {
    tone: 'info',
    children: 'Players appear on the leaderboard after their standard matches are synced.',
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['info', 'success', 'warn', 'error', 'offline'] },
  },
} satisfies Meta<typeof Notice>

export default meta
type Story = StoryObj<typeof meta>

export const Info: Story = {}

export const Success: Story = { args: { tone: 'success', children: 'Results published.' } }

export const Warn: Story = {
  args: { tone: 'warn', children: 'Two queued matches need attention after a player left.' },
}

export const ErrorTone: Story = {
  name: 'Error',
  args: {
    tone: 'error',
    title: "Couldn't load the leaderboard.",
    children: 'Check your connection, then try again.',
  },
}

export const Offline: Story = {
  args: {
    tone: 'offline',
    children:
      'Working offline on this device. Matches, results and roster changes save here and sync when you reconnect. Session done needs internet.',
  },
}

export const WithAction: Story = {
  args: {
    tone: 'warn',
    children: 'Two queued matches need attention after a player left.',
    action: <Button size="sm">Review matches</Button>,
  },
}

export const Phone: Story = { ...Offline, globals: { viewport: { value: 'phone' } } }
