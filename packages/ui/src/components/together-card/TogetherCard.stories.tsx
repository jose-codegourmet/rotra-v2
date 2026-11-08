import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  longName,
  me,
  them,
  togetherGames,
  winRate,
  won,
} from '../shared-game-row/SharedGameRow.storyData'
import { TogetherCard } from './TogetherCard'

const meta = {
  title: 'Player/TogetherCard',
  component: TogetherCard,
  args: { me, them, games: togetherGames.length, won, winRate },
} satisfies Meta<typeof TogetherCard>
export default meta
type Story = StoryObj<typeof meta>
export const Results: Story = {}
export const Empty: Story = { args: { games: 0, won: 0, winRate: null } }
export const LongName: Story = { args: { them: longName } }
export const AllWon: Story = { args: { won: togetherGames.length, winRate: 100 } }
export const AllLost: Story = { args: { won: 0, winRate: 0 } }
export const Initials: Story = {
  args: { me: { ...me, pictureUrl: null }, them: { ...them, pictureUrl: null } },
}
export const Light: Story = { globals: { theme: 'light' } }
export const EmptyLight: Story = { ...Empty, globals: { theme: 'light' } }
export const LongNameLight: Story = { ...LongName, globals: { theme: 'light' } }
export const AllWonLight: Story = { ...AllWon, globals: { theme: 'light' } }
export const AllLostLight: Story = { ...AllLost, globals: { theme: 'light' } }
export const InitialsLight: Story = { ...Initials, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
