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
      'Shows Maria Concepcion Villanueva-Dela Cruz, Jomar Reyes and Migs Santos, who had an off day, in the shared slides.',
  },
  globals: { viewport: { value: 'phone' } },
}
