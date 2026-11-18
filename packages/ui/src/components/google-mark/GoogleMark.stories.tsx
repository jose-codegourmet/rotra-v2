import type { Meta, StoryObj } from '@storybook/react-vite'
import { GoogleMark } from './GoogleMark'

const meta = {
  title: 'Player/GoogleMark',
  component: GoogleMark,
} satisfies Meta<typeof GoogleMark>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Large: Story = { args: { className: 'size-12' } }
export const DefaultLight: Story = { globals: { theme: 'light' } }
