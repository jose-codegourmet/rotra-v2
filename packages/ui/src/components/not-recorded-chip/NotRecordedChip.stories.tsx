import type { Meta, StoryObj } from '@storybook/react-vite'
import { NotRecordedChip } from './NotRecordedChip'

const meta = {
  title: 'Queue/NotRecordedChip',
  component: NotRecordedChip,
} satisfies Meta<typeof NotRecordedChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
