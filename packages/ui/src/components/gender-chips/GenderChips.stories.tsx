import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { GenderChips } from './GenderChips'

const meta = {
  title: 'Player/GenderChips',
  component: GenderChips,
  args: { value: '', required: true, onChange: fn() },
} satisfies Meta<typeof GenderChips>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const Picked: Story = { args: { value: 'female' } }
export const WithError: Story = { args: { error: 'Choose Male or Female.' } }
export const PickedLight: Story = { args: { value: 'male' }, globals: { theme: 'light' } }
