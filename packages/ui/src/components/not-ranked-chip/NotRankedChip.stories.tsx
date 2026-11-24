import type { Meta, StoryObj } from '@storybook/react-vite'
import { NotRankedChip } from './NotRankedChip'

const meta = {
  title: 'Queue/NotRankedChip',
  component: NotRankedChip,
} satisfies Meta<typeof NotRankedChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
