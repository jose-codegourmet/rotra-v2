import { joseSession } from '@rotra/data/fixtures/player-games'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SessionMatchesSheet } from './SessionMatchesSheet'

const session = { ...joseSession(0), sessionPageUrl: 'http://localhost:9000/s/sunday-night-queue' }

const meta = {
  title: 'Player/SessionMatchesSheet',
  component: SessionMatchesSheet,
  args: {
    session,
    onOpenChange: fn(),
    whose: 'Your',
    me: { name: 'Jose Adrian', label: 'You', playerId: 'player-jose' },
    onOpenPlayer: fn(),
    onShareGame: fn(),
    onSharePerformance: fn(),
  },
} satisfies Meta<typeof SessionMatchesSheet>
export default meta
type Story = StoryObj<typeof meta>

/** Your own profile: Share performance and the share icon on each court */
export const Own: Story = {}
export const OwnLight: Story = { globals: { theme: 'light' } }
/** Someone else's profile */
export const SomeoneElse: Story = {
  args: {
    whose: "Mara's",
    me: { name: 'Mara Santos', label: 'Mara', playerId: 'player-mara' },
    onShareGame: undefined,
    onSharePerformance: undefined,
  },
}
/** The session page is gone: no Session page button */
export const SessionPageGone: Story = { args: { session: { ...session, sessionPageUrl: null } } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
