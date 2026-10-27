import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { CountStepper } from './CountStepper'

// Players per court: 2–20, default 8, as the Queue prototype's session defaults.
const meta = {
  title: 'Queue/CountStepper',
  component: CountStepper,
  args: {
    value: 8,
    min: 2,
    max: 20,
    onChange: () => {},
    decrementLabel: 'Fewer players per court',
    incrementLabel: 'More players per court',
  },
} satisfies Meta<typeof CountStepper>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return <CountStepper {...args} value={value} onChange={setValue} />
  },
}
export const AtMin: Story = { args: { value: 2 } }
export const Mid: Story = { args: { value: 8 } }
export const AtMax: Story = { args: { value: 20 } }
export const Large: Story = { args: { size: 'lg' } }
