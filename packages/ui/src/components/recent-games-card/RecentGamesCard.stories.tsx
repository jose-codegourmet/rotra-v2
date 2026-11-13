import { JOSE_SESSIONS } from '@rotra/data/fixtures/player-games'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RecentGamesCard } from './RecentGamesCard'

const meta = { title: 'Player/RecentGamesCard', component: RecentGamesCard } satisfies Meta<
  typeof RecentGamesCard
>
export default meta
type Story = StoryObj<typeof meta>
export const Games: Story = { args: { sessions: JOSE_SESSIONS, onOpenAll: () => {} } }
export const Empty: Story = { args: { sessions: [], onOpenAll: () => {} } }
export const GamesLight: Story = { ...Games, globals: { theme: 'light' } }
export const EmptyLight: Story = { ...Empty, globals: { theme: 'light' } }
export const Phone: Story = { ...Games, globals: { viewport: { value: 'phone' } } }
