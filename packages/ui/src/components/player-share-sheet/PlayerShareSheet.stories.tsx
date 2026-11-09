import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerShareSheet } from './PlayerShareSheet'

const meta = {
  title: 'Player/PlayerShareSheet',
  component: PlayerShareSheet,
  args: { open: true, onOpenChange: () => {}, title: 'Share rank', children: 'Rank card preview' },
} satisfies Meta<typeof PlayerShareSheet>
export default meta
type Story = StoryObj<typeof meta>
export const Open: Story = { args: {} }
