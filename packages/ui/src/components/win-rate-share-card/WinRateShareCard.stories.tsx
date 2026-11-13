import { ShareDialog } from '@rotra/ui/share-dialog'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { WinRateShareCard } from './WinRateShareCard'

const meta = {
  title: 'Queue/WinRateShareCard',
  component: WinRateShareCard,
  args: {
    link: 'https://player.rotra.example/find/RTR-0427',
    name: 'Maya Santos',
    rtrId: 'RTR-0427',
    year: 2026,
    stats: { games: 48, wins: 30, losses: 18, winRate: 62.5 },
    onCopy: () => {},
    webShare: false,
  },
  decorators: [
    (Story) => (
      <ShareDialog open onOpenChange={() => {}} title="Share profile">
        <Story />
      </ShareDialog>
    ),
  ],
} satisfies Meta<typeof WinRateShareCard>
export default meta
type Story = StoryObj<typeof meta>

export const WithGames: Story = { globals: { theme: 'dark' } }
export const WithGamesLight: Story = { globals: { theme: 'light' } }
export const NoGamesThisYear: Story = { args: { stats: null } }
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
