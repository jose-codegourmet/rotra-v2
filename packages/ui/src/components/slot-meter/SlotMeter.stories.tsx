import { admissionCapacityFixture as admission } from '@rotra/data/fixtures/session-waitlist'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SlotMeter } from './SlotMeter'

const meta = {
  title: 'Queue/SlotMeter',
  component: SlotMeter,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  args: { rosterCount: 14, capacity: 24 },
} satisfies Meta<typeof SlotMeter>

export default meta
type Story = StoryObj<typeof meta>

export const Ok: Story = {}
export const Near: Story = { args: { rosterCount: 22 } }
export const Full: Story = { args: { rosterCount: 8, capacity: 8 } }
export const Over: Story = { args: { rosterCount: 10, capacity: 8, waitlistCount: 1 } }
export const WithWaitlist: Story = { args: { waitlistCount: 3 } }

export const ActiveFull: Story = {
  args: { live: true, rosterCount: admission.full, capacity: admission.capacity },
}
export const ActiveOverPlan: Story = {
  args: { live: true, rosterCount: admission.over, capacity: admission.capacity },
}

const mix = { beginner: 4, intermediate: 6, advanced: 3, unrated: 1 }

export const WithSkillMix: Story = { args: { skillCounts: mix } }
export const SkillMixFull: Story = {
  args: {
    rosterCount: 24,
    capacity: 24,
    skillCounts: { beginner: 8, intermediate: 9, advanced: 6, unrated: 1 },
  },
}
export const SkillMixOverBudget: Story = {
  args: {
    rosterCount: 10,
    capacity: 8,
    waitlistCount: 1,
    skillCounts: { beginner: 3, intermediate: 4, advanced: 3 },
  },
}
export const SkillMixLevelActive: Story = {
  args: { skillCounts: mix, activeLevel: 'intermediate', onLevelPress: () => {} },
}
export const SkillMixOneOpenSlot: Story = {
  args: {
    rosterCount: 23,
    capacity: 24,
    skillCounts: { beginner: 8, intermediate: 9, advanced: 6 },
  },
}
