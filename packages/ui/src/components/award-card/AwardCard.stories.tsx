import type { Meta, StoryObj } from '@storybook/react-vite'
import { AwardCard } from './AwardCard'

const meta = {
  title: 'Queue/AwardCard',
  component: AwardCard,
  args: {
    tone: 'mvp',
    label: 'MVP',
    name: 'Maya Santos',
    standing: { position: 1, of: 18, wins: 6, losses: 0 },
    reason: 'Won more than expected for their level, partners and opponents.',
    onOpenFace: () => {},
    onShare: () => {},
  },
  decorators: [
    (Story) => (
      <div className="max-w-[360px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AwardCard>
export default meta
type Story = StoryObj<typeof meta>

export const Mvp: Story = { globals: { theme: 'dark' } }
export const MvpLight: Story = { globals: { theme: 'light' } }
export const MostImproved: Story = {
  args: {
    tone: 'improved',
    label: 'Most Improved',
    name: 'Y*** R***',
    onOpenFace: undefined,
    reason: 'Played above their last 6 sessions at this club.',
  },
}
export const OffDay: Story = {
  args: {
    tone: 'off',
    label: undefined,
    name: 'Ben Cruz',
    standing: { position: 16, of: 18, wins: 1, losses: 5 },
    reason: 'Below their usual results across their last 7 club sessions.',
  },
}
export const NoCountedGame: Story = { args: { standing: null } }
