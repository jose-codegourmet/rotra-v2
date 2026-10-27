import { migsSession } from '@rotra/data/fixtures/player-games'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionGames } from './SessionGames'

const meta = { title: 'Player/SessionGames', component: SessionGames } satisfies Meta<
  typeof SessionGames
>
export default meta
type Story = StoryObj<typeof meta>
export const WithLink: Story = {
  args: {
    session: { ...migsSession(0), sessionPageUrl: 'http://localhost:3000/s/sunday-night-queue' },
  },
}
export const PageGone: Story = { args: { session: migsSession(3) } }
