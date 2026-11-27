import { joseGame } from '@rotra/data/fixtures/player-games'
import { JOSE_PLAYER_ID, players } from '@rotra/data/fixtures/players'
import type { MatchPagePlayer } from '@rotra/data/match-page/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerStatsCard } from './PlayerStatsCard'

const jose = players.find((player) => player.id === JOSE_PLAYER_ID)
if (!jose) throw new Error('Missing the signed-in player fixture.')

const earlier = joseGame(0, 0)
const earlierGames = [
  {
    ...earlier,
    sessionGameNumber: 1,
    partnerPlayers: earlier.partners.map(() => ({ name: 'A***', picture: null, playerId: null })),
    opponentPlayers: earlier.opponents.map((name) => ({
      name: name === 'Gab' ? name : 'M*** A***',
      picture: null,
      playerId: name === 'Gab' ? 'gab' : 'mikee',
    })),
  },
]
const player: MatchPagePlayer = {
  playerId: JOSE_PLAYER_ID,
  name: jose.fullName,
  picture: null,
  skillGroup: 'intermediate',
  counting: 'counted',
  sessionGameNumber: 2,
  earlierGames,
  beforeGame: { played: 1, wins: 1, losses: 0, winRate: 100 },
  yearWinRate: 64,
}
const firstGamePlayer: MatchPagePlayer = {
  ...player,
  sessionGameNumber: 1,
  earlierGames: [],
  beforeGame: { played: 0, wins: 0, losses: 0, winRate: null },
}

const meta = {
  title: 'Player/PlayerStatsCard',
  component: PlayerStatsCard,
  decorators: [(Story) => <div className="mx-auto max-w-[620px]">{Story()}</div>],
  args: {
    player,
    year: 2026,
    onOpenPlayer: () => {},
    onClose: () => {},
    onOpenGame: () => {},
  },
} satisfies Meta<typeof PlayerStatsCard>

export default meta
type Story = StoryObj<typeof meta>

export const EarlierGames: Story = { globals: { theme: 'dark' } }
export const EarlierGamesLight: Story = { globals: { theme: 'light' } }

export const FirstGame: Story = { args: { player: firstGamePlayer } }
export const Guest: Story = {
  args: {
    player: {
      ...player,
      playerId: null,
      name: 'A***',
      skillGroup: null,
      yearWinRate: null,
    },
  },
}
export const MaskedProfile: Story = {
  args: {
    player: {
      ...firstGamePlayer,
      name: 'J*** R***',
      skillGroup: null,
      beforeGame: null,
      yearWinRate: null,
    },
  },
}
export const YourStats: Story = {
  args: { viewerPlayerId: JOSE_PLAYER_ID, onShareGame: () => {} },
}
export const YourFirstGame: Story = {
  args: { player: firstGamePlayer, viewerPlayerId: JOSE_PLAYER_ID },
}
export const FirstGamePhone: Story = {
  ...FirstGame,
  globals: { viewport: { value: 'phone' } },
}

export const FirstGameLight: Story = { ...FirstGame, globals: { theme: 'light' } }
export const GuestLight: Story = { ...Guest, globals: { theme: 'light' } }
export const MaskedProfileLight: Story = { ...MaskedProfile, globals: { theme: 'light' } }
export const YourStatsLight: Story = { ...YourStats, globals: { theme: 'light' } }
