import type { Meta, StoryObj } from '@storybook/react-vite'
import { DateBlock } from './DateBlock'

const meta = {
  title: 'Player/DateBlock',
  component: DateBlock,
  args: { at: new Date(2026, 10, 13, 19, 0).getTime() },
} satisfies Meta<typeof DateBlock>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Large: Story = { args: { size: 'lg' } }
export const DefaultLight: Story = { globals: { theme: 'light' } }
export const LargeLight: Story = { args: { size: 'lg' }, globals: { theme: 'light' } }
