import { ShareDialog } from '@rotra/ui/share-dialog'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LeaderboardShareCard, type LeaderboardShareRow } from './LeaderboardShareCard'

const NAMES = [
  'Maya Santos',
  'Ben Cruz',
  'Jose Buctuanon',
  'Y*** R***',
  'Ana Lim',
  'Carlo Reyes',
  'Bea Villanueva-Dela Cruz',
  'Paolo Tan',
  'K*** S***',
  'Lia Mendoza',
]
const rows = (count: number, viewer = -1): LeaderboardShareRow[] =>
  Array.from({ length: count }, (_, i) => ({
    position: i + 1,
    name: NAMES[i % NAMES.length] ?? 'Player',
    wins: Math.max(0, 7 - Math.floor(i / 3)),
    losses: Math.floor(i / 3),
    games: 7,
    isViewer: i === viewer,
  }))
const meta = {
  title: 'Queue/LeaderboardShareCard',
  component: LeaderboardShareCard,
  args: {
    rows: rows(18),
    sessionTitle: 'Thursday Smash Night',
    dateLine: 'Thu, Oct 23 · Smash Club',
    club: { initials: 'SC' },
    link: 'https://queue.rotra.example/s/thursday-smash',
    onCopy: () => {},
    webShare: false,
  },
  decorators: [
    (Story) => (
      <ShareDialog open onOpenChange={() => {}} title="Share leaderboard">
        <Story />
      </ShareDialog>
    ),
  ],
} satisfies Meta<typeof LeaderboardShareCard>
export default meta
type Story = StoryObj<typeof meta>

export const QueueMaster18: Story = { globals: { theme: 'dark' } }
export const QueueMaster18Light: Story = { globals: { theme: 'light' } }
export const Players24: Story = { args: { rows: rows(24) } }
export const YouHighlighted: Story = { args: { rows: rows(24, 12) }, globals: { theme: 'dark' } }
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
