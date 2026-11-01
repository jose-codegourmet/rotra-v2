import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Checkbox } from './Checkbox'

const meta = {
  title: 'Shared/Fields/Checkbox',
  component: Checkbox,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  args: { label: 'Standings', description: '14 players' },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(true)
    return <Checkbox {...args} checked={checked} onChange={setChecked} />
  },
}

export const Unchecked: Story = { args: { checked: false } }
export const Disabled: Story = { args: { checked: true, disabled: true } }
export const LabelOnly: Story = { args: { description: undefined, label: 'Remember this device' } }

export const LongLabel: Story = {
  args: {
    label: 'Include Off Day',
    description:
      'Shows Raymark, Mikee Abellana and Jose in the shared slides. A long description must wrap, not overflow.',
  },
  globals: { viewport: { value: 'phone' } },
}

export const Compact: Story = {
  args: { variant: 'compact', label: 'Select Kenjie', description: undefined },
  render: (args) => {
    const [checked, setChecked] = useState(false)
    return <Checkbox {...args} checked={checked} onChange={setChecked} />
  },
}
export const CompactLight: Story = { ...Compact, globals: { theme: 'light' } }
export const CompactChecked: Story = {
  args: { variant: 'compact', label: 'Select Kenjie', description: undefined, checked: true },
}
export const CompactDisabled: Story = {
  args: {
    variant: 'compact',
    label: 'Select Kenjie',
    description: undefined,
    disabled: true,
    checked: true,
  },
}
