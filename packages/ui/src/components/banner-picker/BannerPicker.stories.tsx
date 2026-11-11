import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { BannerPicker } from './BannerPicker'

const meta = {
  title: 'Player/BannerPicker',
  component: BannerPicker,
  args: { value: 'court', onChange: fn() },
  decorators: [(Story) => <div className="mx-auto max-w-[560px]">{Story()}</div>],
} satisfies Meta<typeof BannerPicker>
export default meta
type Story = StoryObj<typeof meta>

export const CourtSelected: Story = {}
export const CourtSelectedLight: Story = { globals: { theme: 'light' } }
export const StripeSelected: Story = { args: { value: 'stripe' } }
export const NoBannerYet: Story = { args: { value: null } }
export const Disabled: Story = { args: { disabled: true } }
export const DisabledLight: Story = { args: { disabled: true }, globals: { theme: 'light' } }
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState('court')
    return <BannerPicker {...args} value={value} onChange={setValue} />
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
