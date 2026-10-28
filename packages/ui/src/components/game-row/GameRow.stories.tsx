import { joseGame } from '@rotra/data/fixtures/player-games'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { GameRow } from './GameRow'

const meta = { title: 'Player/GameRow', component: GameRow } satisfies Meta<typeof GameRow>
export default meta
type Story = StoryObj<typeof meta>
export const WonWithScore: Story = { args: { game: joseGame(0, 0) } }
export const LostWithoutScore: Story = { args: { game: joseGame(0, 1) } }
export const Singles: Story = { args: { game: joseGame(0, 2) } }
export const Fun: Story = { args: { game: joseGame(0, 3) } }
export const PartialWithNote: Story = { args: { game: joseGame(2, 2) } }
