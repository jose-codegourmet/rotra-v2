import type { Meta, StoryObj } from '@storybook/react-vite'
import { IdentityChip } from './IdentityChip'

const meta = {
  title: 'Queue/IdentityChip',
  component: IdentityChip,
  args: { identity: 'registered' },
} satisfies Meta<typeof IdentityChip>

export default meta
type Story = StoryObj<typeof meta>

export const Registered: Story = {}
export const Unclaimed: Story = { args: { identity: 'unclaimed' } }
export const Guest: Story = { args: { identity: 'guest' } }
export const LookupPending: Story = { args: { identity: 'pending' } }
