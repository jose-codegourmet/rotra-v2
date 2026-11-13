import { joseGame } from '@rotra/data/fixtures/player-games'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { GameRow } from './GameRow'

const you = { name: 'Jose Buctuanon', label: 'You', playerId: 'jose' }
const withFaces = (session: number, index: number) => {
  const game = joseGame(session, index)
  return {
    ...game,
    partnerPlayers: game.partners.map((name) => ({ name, picture: null, playerId: null })),
    opponentPlayers: game.opponents.map((name, i) => ({
      name,
      picture: null,
      playerId: i === 0 ? `p-${name}` : null,
    })),
  }
}
const meta = {
  title: 'Player/GameRow',
  component: GameRow,
  args: { game: withFaces(0, 0), me: you, onOpenPlayer: () => {} },
} satisfies Meta<typeof GameRow>
export default meta
type Story = StoryObj<typeof meta>
export const WonWithScore: Story = { globals: { theme: 'dark' } }
export const WonWithScoreLight: Story = { globals: { theme: 'light' } }
export const OwnGameShareable: Story = { args: { onShare: () => {} }, globals: { theme: 'dark' } }
export const LostWithoutScore: Story = { args: { game: withFaces(0, 1) } }
export const Singles: Story = { args: { game: withFaces(0, 2) } }
export const Fun: Story = { args: { game: withFaces(0, 3) } }
export const PartialWithNote: Story = { args: { game: withFaces(2, 2) } }
export const SomeoneElse: Story = {
  args: { me: { name: 'Mikee Abellana', label: 'Mikee', playerId: 'mikee' } },
}
/** No per-player detail (real mode for now): only the owner's face opens a card. */
export const NamesOnly: Story = { args: { game: joseGame(0, 0) } }
export const WithDateLine: Story = {
  args: { dateLine: 'Sunday Night Queue · Sun, Oct 26 · Lahug Smash Club' },
}
export const Phone: Story = {
  args: { onShare: () => {} },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
export const PhoneLight: Story = {
  args: { onShare: () => {} },
  globals: { theme: 'light', viewport: { value: 'phone' } },
}
