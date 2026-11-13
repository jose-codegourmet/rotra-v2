import { ShareDialog } from '@rotra/ui/share-dialog'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AwardShareCard } from './AwardShareCard'

const common = {
  sessionTitle: 'Thursday Smash Night',
  dateLabel: 'Thu, Oct 23',
  club: { name: 'Smash Club', initials: 'SC' },
  link: 'https://queue.rotra.example/s/thursday-smash',
  onCopy: () => {},
  webShare: false,
}
const meta: Meta<typeof AwardShareCard> = {
  title: 'Queue/AwardShareCard',
  component: AwardShareCard,
  args: {
    ...common,
    kind: 'award',
    entry: {
      award: 'MVP',
      name: 'Maya Santos',
      standing: { position: 1, of: 18, wins: 6, losses: 0 },
    },
    reason: 'Won more than expected for their level, partners and opponents.',
  },
  decorators: [
    (Story) => (
      <ShareDialog open onOpenChange={() => {}} title="Share MVP">
        <Story />
      </ShareDialog>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof AwardShareCard>

export const Mvp: Story = { globals: { theme: 'dark' } }
export const MvpLight: Story = { globals: { theme: 'light' } }
export const AwardsSet: Story = {
  args: {
    ...common,
    kind: 'set',
    set: 'awards',
    entries: [
      { award: 'MVP', name: 'Maya Santos', standing: { position: 1, of: 18, wins: 6, losses: 0 } },
      {
        award: 'Most Improved',
        name: 'Y*** R***',
        standing: { position: 4, of: 18, wins: 4, losses: 2 },
      },
    ],
  },
}
export const OffDaySet: Story = {
  args: {
    ...common,
    kind: 'set',
    set: 'off-day',
    entries: [
      {
        award: 'Off Day',
        name: 'Ben Cruz',
        standing: { position: 16, of: 18, wins: 1, losses: 5 },
      },
    ],
  },
}
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
