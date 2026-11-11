import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { RadioChoiceList } from './RadioChoiceList'

const choices = [
  {
    value: 'public',
    title: 'Public',
    description: 'Visitors and signed-in ROTRA players see your profile.',
  },
  {
    value: 'private',
    title: 'Private',
    description: 'Visitors see your name masked. Signed-in ROTRA players see your profile.',
  },
]

const meta = {
  title: 'Shared/RadioChoiceList',
  component: RadioChoiceList,
  args: { choices, value: 'private', onChange: fn(), 'aria-label': 'Profile visibility' },
  decorators: [(Story) => <div className="mx-auto max-w-[560px]">{Story()}</div>],
} satisfies Meta<typeof RadioChoiceList>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const DefaultLight: Story = { globals: { theme: 'light' } }
export const Disabled: Story = { args: { disabled: true, 'aria-busy': true } }
export const DisabledLight: Story = {
  args: { disabled: true, 'aria-busy': true },
  globals: { theme: 'light' },
}
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState('private')
    return <RadioChoiceList {...args} value={value} onChange={setValue} />
  },
}
