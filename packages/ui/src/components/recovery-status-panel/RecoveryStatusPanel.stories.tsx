import type { Meta, StoryObj } from '@storybook/react-vite'
import { RecoveryStatusPanel } from './RecoveryStatusPanel'

const meta = {
  title: 'Queue/RecoveryStatusPanel',
  component: RecoveryStatusPanel,
  args: { state: 'waiting' },
} satisfies Meta<typeof RecoveryStatusPanel>
export default meta
type Story = StoryObj<typeof meta>
export const Waiting: Story = {}
export const Received: Story = { args: { state: 'received' } }
