import { JOSE_SESSIONS, joseSession } from '@rotra/data/fixtures/player-games'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionGames } from './SessionGames'

const meta = { title: 'Player/SessionGames', component: SessionGames } satisfies Meta<
  typeof SessionGames
>
export default meta
type Story = StoryObj<typeof meta>
export const WithLink: Story = {
  args: {
    session: { ...joseSession(0), sessionPageUrl: 'http://localhost:9000/s/sunday-night-queue' },
  },
}
export const PageGone: Story = { args: { session: joseSession(3) } }
/** A session run with Record games off: the Not ranked chip after the club */
export const NotRanked: Story = {
  args: { session: JOSE_SESSIONS.find((s) => s.ranked === false) ?? joseSession(0) },
  globals: { theme: 'dark' },
}
export const NotRankedLight: Story = { ...NotRanked, globals: { theme: 'light' } }
