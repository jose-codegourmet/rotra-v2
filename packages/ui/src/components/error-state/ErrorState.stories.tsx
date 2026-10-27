import type { Meta, StoryObj } from '@storybook/react-vite'
import { ErrorState } from './ErrorState'

const meta = {
  title: 'Shared/States/ErrorState',
  component: ErrorState,
  args: {
    title: "Couldn't load the leaderboard.",
    children: 'Check your connection, then try again.',
    onRetry: () => {},
  },
} satisfies Meta<typeof ErrorState>

export default meta
type Story = StoryObj<typeof meta>

export const Retryable: Story = {}
export const Retrying: Story = { args: { retrying: true } }

export const Permission: Story = {
  args: {
    kind: 'permission',
    title: 'Club settings need an internet connection.',
    children: undefined,
    onRetry: undefined,
  },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
