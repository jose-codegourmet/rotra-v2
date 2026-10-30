import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerAccountChip } from './PlayerAccountChip'

const meta = {
  title: 'Admin/PlayerAccountChip',
  component: PlayerAccountChip,
  args: { claimed: true },
} satisfies Meta<typeof PlayerAccountChip>

export default meta
type Story = StoryObj<typeof meta>

export const Registered: Story = {}
export const Unclaimed: Story = { args: { claimed: false } }

const both = (
  <div className="flex flex-wrap gap-2">
    <PlayerAccountChip claimed />
    <PlayerAccountChip claimed={false} />
  </div>
)
export const BothStates: Story = { render: () => both }
export const BothStatesLight: Story = { render: () => both, globals: { theme: 'light' } }
