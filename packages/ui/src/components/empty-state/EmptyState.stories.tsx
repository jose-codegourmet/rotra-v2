import { Button } from '@rotra/ui/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { EmptyState } from './EmptyState'

const meta = {
  title: 'Shared/States/EmptyState',
  component: EmptyState,
  args: {
    title: 'No clubs match.',
    children: "Check the spelling, or search by the club's username.",
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithAction: Story = {
  args: { action: <Button size="sm">Clear search and filter</Button> },
}

export const MessageOnly: Story = {
  args: {
    title: undefined,
    children:
      'No players qualify for the leaderboard yet. Players appear after 10 standard matches in the last three months.',
  },
}

export const Phone: Story = { ...WithAction, globals: { viewport: { value: 'phone' } } }
