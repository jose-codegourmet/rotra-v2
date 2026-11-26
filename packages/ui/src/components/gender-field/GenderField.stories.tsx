import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { GenderField, type GenderValue } from './GenderField'

const meta = {
  title: 'Shared/GenderField',
  component: GenderField,
  args: { value: '', onChange: () => {} },
  render: (args) => {
    const [value, setValue] = useState<GenderValue>(args.value)
    return <GenderField {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof GenderField>

export default meta
type Story = StoryObj<typeof meta>

export const NotGiven: Story = {}
export const Male: Story = { args: { value: 'male' } }
export const Female: Story = { args: { value: 'female' } }
export const Disabled: Story = { args: { value: 'female', disabled: true } }
