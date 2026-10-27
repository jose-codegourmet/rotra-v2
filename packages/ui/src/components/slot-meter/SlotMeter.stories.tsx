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
