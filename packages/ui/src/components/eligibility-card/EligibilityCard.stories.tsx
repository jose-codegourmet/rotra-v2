import type { Meta, StoryObj } from '@storybook/react-vite'
import { EligibilityCard } from './EligibilityCard'

const meta = {
  title: 'Player/EligibilityCard',
  component: EligibilityCard,
  args: { recentCount: 10, matchRequirement: 10 },
} satisfies Meta<typeof EligibilityCard>

export default meta
type Story = StoryObj<typeof meta>
export const Qualifies: Story = {}
export const BelowThreshold: Story = { args: { recentCount: 7 } }
export const NeedsReassessment: Story = { args: { needsReassessment: true } }
export const ThresholdChanged: Story = { args: { recentCount: 10, matchRequirement: 12 } }
