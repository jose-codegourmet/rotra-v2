import type { Meta, StoryObj } from '@storybook/react-vite'
import { PickChip } from './PickChip'

const meta = {
  title: 'Player/PickChip',
  component: PickChip,
  args: { children: 'Smash', role: 'checkbox', picked: false },
} satisfies Meta<typeof PickChip>

export default meta
type Story = StoryObj<typeof meta>

export const NotPicked: Story = {}
export const Picked: Story = { args: { picked: true } }
export const PickedLight: Story = { args: { picked: true }, globals: { theme: 'light' } }
export const NotPickedLight: Story = { globals: { theme: 'light' } }
export const ActionChip: Story = { args: { role: undefined, children: '+ Others' } }
