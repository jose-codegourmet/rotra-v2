import { adminPlayerDetailExamples } from '@rotra/data/fixtures/admin-players'
import { rankingSettings } from '@rotra/data/fixtures/ranking-settings'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerRankCard } from './PlayerRankCard'

const { rank } = adminPlayerDetailExamples

const meta = {
  title: 'Admin/PlayerRankCard',
  component: PlayerRankCard,
  args: { ...rank.board, matchRequirement: rankingSettings.matchRequirement },
} satisfies Meta<typeof PlayerRankCard>

export default meta
type Story = StoryObj<typeof meta>

export const Board: Story = {}
export const Below: Story = { args: rank.below }
export const None: Story = { args: rank.none }
export const Phone: Story = { args: rank.below, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }
export const BelowLight: Story = { args: rank.below, globals: { theme: 'light' } }
