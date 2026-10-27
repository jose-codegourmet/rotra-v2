import { Field } from '@rotra/ui/field'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Select, type SelectOptionGroup } from './Select'

// Playing levels as the prototypes group them; the typed union arrives with @rotra/data (F06.2).
const LEVELS: SelectOptionGroup[] = ['Beginner', 'Intermediate', 'Advanced'].map((band) => ({
  label: band,
  options: ['Low', 'Mid', 'High'].map((step) => ({
    value: `${band.toLowerCase()}-${step.toLowerCase()}`,
    label: `${band} ${step}`,
  })),
}))

const meta = {
  title: 'Shared/Fields/Select',
  component: Select,
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
  args: { options: LEVELS, 'aria-label': 'Playing level', placeholder: 'Choose a level…' },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState('')
    return <Select {...args} value={value} onChange={setValue} />
  },
}

export const Selected: Story = { args: { value: 'intermediate-mid' } }
export const Invalid: Story = { args: { invalid: true } }
export const Disabled: Story = { args: { disabled: true, value: 'beginner-high' } }

export const Flat: Story = {
  args: {
    'aria-label': 'Session mode',
    options: [
      { value: 'chill', label: 'Chill' },
      { value: 'fair', label: 'Fair' },
      { value: 'hard', label: 'Hard' },
    ],
    value: 'fair',
  },
}

export const InField: Story = {
  render: () => {
    const [value, setValue] = useState('')
    return (
      <Field label="Level" error={value ? undefined : 'Choose a level for this player.'}>
        <Select options={LEVELS} value={value} onChange={setValue} placeholder="Choose a level…" />
      </Field>
    )
  },
}
