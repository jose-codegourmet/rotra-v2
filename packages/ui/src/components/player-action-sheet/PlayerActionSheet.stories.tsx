import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PlayerActionSheet } from './PlayerActionSheet'

const meta = {
  title: 'Queue/PlayerActionSheet',
  component: PlayerActionSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    name: 'Mikee Abellana',
    team: 'A',
    matchNo: 7,
    onSubstitute: fn(),
    onReplace: fn(),
    onViewProfile: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof PlayerActionSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const TeamB: Story = { args: { name: 'Dexter Ramos', team: 'B' } }
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
