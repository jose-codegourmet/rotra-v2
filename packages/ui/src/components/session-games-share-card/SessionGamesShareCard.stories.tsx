import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionGamesShareCard } from './SessionGamesShareCard'

const portrait = (index: number) => playerProfiles.filter((p) => p.picture)[index]?.picture ?? null
const meta = {
  title: 'Player/SessionGamesShareCard',
  component: SessionGamesShareCard,
  args: {
    webShare: false,
    link: 'https://players.rotra.example/players/u1',
    name: 'Miguel Santos',
    nickname: 'Migs',
    picture: portrait(0),
    title: 'Sunday Night Queue',
    dateLabel: 'Nov 8',
    clubName: 'Lahug Smash Club',
    wins: 3,
    losses: 1,
    onCopy: () => {},
    games: [
      {
        id: '1',
        format: 'doubles',
        partners: ['J*** A***'],
        partnerPlayers: [{ name: 'J*** A***', picture: null }],
        opponentPlayers: [
          { name: 'Bea Castillo', picture: portrait(1) },
          { name: 'N*** O***', picture: null },
        ],
        opponents: ['Bea Castillo', 'N*** O***'],
        counting: 'counted',
        result: 'won',
        score: '21–18',
      },
      {
        id: '2',
        format: 'singles',
        partners: [],
        opponents: ['R*** A***'],
        counting: 'counted',
        result: 'lost',
        score: null,
      },
    ],
  },
} satisfies Meta<typeof SessionGamesShareCard>
export default meta
type Story = StoryObj<typeof meta>
export const AllSizes: Story = { args: {} }
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const MoreThanEight: Story = {
  args: {
    wins: 8,
    losses: 4,
    games: Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      format: 'doubles' as const,
      partners: ['J*** A***'],
      opponents: ['Bea Castillo', 'N*** O***'],
      counting: 'counted' as const,
      partnerPlayers: [
        { name: i % 2 ? 'Aaron' : 'J*** A***', picture: i % 2 ? portrait(2) : null },
      ],
      opponentPlayers: [
        { name: 'Bea Castillo', picture: portrait(1) },
        { name: 'N*** O***', picture: null },
      ],
      result: i % 3 === 1 ? ('lost' as const) : ('won' as const),
      score: i === 2 ? null : i % 3 === 1 ? '17–21' : '21–18',
    })),
  },
}

export const Singles: Story = {
  args: {
    wins: 0,
    losses: 1,
    games: [
      {
        id: 'single',
        format: 'singles',
        partners: [],
        opponents: ['Bea Castillo'],
        opponentPlayers: [{ name: 'Bea Castillo', picture: portrait(1) }],
        counting: 'counted',
        result: 'lost',
        score: '17–21',
      },
    ],
  },
}
