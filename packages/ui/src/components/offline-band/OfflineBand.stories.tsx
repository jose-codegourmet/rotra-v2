import type { Meta, StoryObj } from '@storybook/react-vite'
import { OfflineBand } from './OfflineBand'

const meta = {
  title: 'Player/OfflineBand',
  component: OfflineBand,
  args: { savedAt: new Date('2026-10-27T08:15:00+08:00') },
} satisfies Meta<typeof OfflineBand>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
