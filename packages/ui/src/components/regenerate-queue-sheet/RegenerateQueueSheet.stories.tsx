import { matchLineupFixtures } from '@rotra/data/fixtures/match-lineups'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { RegenerateQueueSheet } from './RegenerateQueueSheet'

const { regenerate } = matchLineupFixtures

const meta = {
  title: 'Queue/RegenerateQueueSheet',
  component: RegenerateQueueSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    scope: regenerate.withCounts,
    onConfirm: fn(),
  },
} satisfies Meta<typeof RegenerateQueueSheet>

export default meta
type Story = StoryObj<typeof meta>

export const WithCounts: Story = {}
export const WithAutomaticMatches: Story = { args: { scope: regenerate.withAutoMatches } }
export const NothingToRebuild: Story = { args: { scope: regenerate.nothingToRebuild } }
export const Pending: Story = { args: { isPending: true } }
export const Failed: Story = {
  args: { error: matchLineupFixtures.bothFormatsOff },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
