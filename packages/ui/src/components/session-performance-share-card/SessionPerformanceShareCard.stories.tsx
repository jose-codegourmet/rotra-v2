import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionPerformanceShareCard } from './SessionPerformanceShareCard'

const portrait = (index: number) => playerProfiles.filter((p) => p.picture)[index]?.picture ?? null
const meta = {
  title: 'Player/SessionPerformanceShareCard',
  component: SessionPerformanceShareCard,
  args: {
    webShare: false,
    link: 'https://players.rotra.example/players/u1',
    name: 'Miguel Santos',
    nickname: 'Migs',
    picture: portrait(0),
    title: 'Sunday Night Queue',
    dateLabel: 'Nov 8',
    clubName: 'Lahug Smash Club',
    wins: 2,
    losses: 1,
    games: 4,
    position: 3,
    onCopy: () => {},
  },
} satisfies Meta<typeof SessionPerformanceShareCard>
export default meta
type Story = StoryObj<typeof meta>

export const Published: Story = { globals: { theme: 'dark' } }
export const PublishedLight: Story = { globals: { theme: 'light' } }
/** Before the club publishes: no Standing. */
export const NotPublishedYet: Story = { args: { position: null }, globals: { theme: 'dark' } }
export const NoCountedGames: Story = {
  args: { wins: 0, losses: 0, games: 2, position: null },
  globals: { theme: 'dark' },
}
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
