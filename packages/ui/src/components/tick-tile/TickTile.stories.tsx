import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { TickTile } from './TickTile'

const meta = {
  title: 'Shared/Fields/TickTile',
  component: TickTile,
  args: { label: '2 v 2', checked: false },
} satisfies Meta<typeof TickTile>

export default meta
type Story = StoryObj<typeof meta>

export const Unticked: Story = {}
export const Ticked: Story = { args: { checked: true } }
export const Interactive: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(false)
    return <TickTile {...args} checked={checked} onChange={setChecked} />
  },
}
export const TickedLight: Story = { args: { checked: true }, globals: { theme: 'light' } }
export const UntickedLight: Story = { globals: { theme: 'light' } }
