import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionResultShareCard } from './SessionResultShareCard'

const meta = {
  title: 'Player/SessionResultShareCard',
  component: SessionResultShareCard,
  args: {
    webShare: false,
    link: 'https://players.rotra.example/players/u1',
    name: 'Miguel Santos',
    nickname: 'Migs',
    title: 'Sunday Night Queue',
    dateLabel: 'Nov 8',
    clubName: 'Lahug Smash Club',
    position: 4,
    games: 4,
    wins: 3,
    losses: 1,
    onCopy: () => {},
  },
} satisfies Meta<typeof SessionResultShareCard>
export default meta
type Story = StoryObj<typeof meta>
export const AllSizes: Story = { args: {} }
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const LongTitle: Story = {
  args: { title: 'A long Sunday night badminton session title at the club' },
}
