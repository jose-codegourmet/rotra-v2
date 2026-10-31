import { savedPlayerStats, zeroSavedPlayerStats } from '@rotra/data/fixtures/saved-player-stats'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SavedPlayerStatsCarousel } from './SavedPlayerStatsCarousel'

const meta = {
  title: 'Queue/SavedPlayerStatsCarousel',
  component: SavedPlayerStatsCarousel,
  args: { stats: savedPlayerStats },
} satisfies Meta<typeof SavedPlayerStatsCarousel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Zero: Story = { args: { stats: zeroSavedPlayerStats } }
export const Loading: Story = { args: { stats: undefined } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Light: Story = { globals: { theme: 'light' } }
