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
export const Verified: Story = {
  args: { verification: { verified: true, verifiedByAdmin: false, completedSteps: 3 } },
}
export const VerifiedByAdmin: Story = {
  args: { verification: { verified: true, verifiedByAdmin: true, completedSteps: 1 } },
}
export const NotVerified: Story = {
  args: { verification: { verified: false, verifiedByAdmin: false, completedSteps: 2 } },
}

const all = (
  <div className="flex flex-wrap gap-2">
    <PlayerAccountChip
      claimed
      verification={{ verified: true, verifiedByAdmin: false, completedSteps: 3 }}
    />
    <PlayerAccountChip
      claimed
      verification={{ verified: true, verifiedByAdmin: true, completedSteps: 1 }}
    />
    <PlayerAccountChip
      claimed
      verification={{ verified: false, verifiedByAdmin: false, completedSteps: 2 }}
    />
    <PlayerAccountChip claimed={false} />
  </div>
)
export const AllStates: Story = { render: () => all }
export const AllStatesLight: Story = { render: () => all, globals: { theme: 'light' } }
