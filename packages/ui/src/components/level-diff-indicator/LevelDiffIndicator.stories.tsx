import type { Meta, StoryObj } from '@storybook/react-vite'
import { LevelDiffIndicator } from './LevelDiffIndicator'

const meta = {
  title: 'Queue/LevelDiffIndicator',
  component: LevelDiffIndicator,
  args: { level: 'intermediate_mid', suggestion: 'intermediate_mid' },
} satisfies Meta<typeof LevelDiffIndicator>

export default meta
type Story = StoryObj<typeof meta>

export const Matches: Story = {}
export const TooHigh: Story = { args: { level: 'advanced_low', suggestion: 'intermediate_low' } }
export const TooLow: Story = { args: { level: 'beginner_high', suggestion: 'intermediate_low' } }
export const NoSuggestion: Story = { args: { suggestion: null } }
