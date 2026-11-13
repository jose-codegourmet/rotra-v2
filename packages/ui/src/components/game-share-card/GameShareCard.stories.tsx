import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { GameShareCard } from './GameShareCard'

const portrait = (index: number) => playerProfiles.filter((p) => p.picture)[index]?.picture ?? null
const meta = {
  title: 'Player/GameShareCard',
  component: GameShareCard,
  args: {
    webShare: false,
    link: 'https://players.rotra.example/players/u1',
    name: 'Miguel Santos',
    nickname: 'Migs',
    picture: portrait(0),
    title: 'Sunday Night Queue',
    dateLabel: 'Nov 8',
    clubName: 'Lahug Smash Club',
    onCopy: () => {},
    game: {
      id: '1',
      format: 'doubles',
      partners: ['J*** A***'],
      partnerPlayers: [{ name: 'J*** A***', picture: null }],
      opponents: ['Bea Castillo', 'N*** O***'],
      opponentPlayers: [
        { name: 'Bea Castillo', picture: portrait(1) },
        { name: 'N*** O***', picture: null },
      ],
      counting: 'counted',
      result: 'won',
      score: '21–18',
    },
  },
} satisfies Meta<typeof GameShareCard>
export default meta
type Story = StoryObj<typeof meta>

export const DoublesWon: Story = { globals: { theme: 'dark' } }
export const DoublesWonLight: Story = { globals: { theme: 'light' } }
export const SinglesLostNoScore: Story = {
  args: {
    game: {
      id: '2',
      format: 'singles',
      partners: [],
      opponents: ['R*** A***'],
      opponentPlayers: [{ name: 'R*** A***', picture: null }],
      counting: 'counted',
      result: 'lost',
      score: null,
    },
  },
  globals: { theme: 'dark' },
}
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
