import type { Meta, StoryObj } from '@storybook/react-vite'
import { PublicAwards } from './PublicAwards'

const meta = {
  title: 'Queue/PublicAwards',
  component: PublicAwards,
  args: {
    awardsShared: true,
    mvp: {
      id: 'mvp',
      name: 'Maya Santos',
      standing: { position: 1, of: 18, wins: 6, losses: 0 },
      reason: 'Won more than expected for their level, partners and opponents.',
      onOpenFace: () => {},
      onShare: () => {},
    },
    mostImproved: {
      id: 'mi',
      name: 'Y*** R***',
      standing: { position: 4, of: 18, wins: 4, losses: 2 },
      reason: 'Played above their last 6 sessions at this club.',
      onShare: () => {},
    },
    offDay: null,
    onShareAwards: () => {},
    onShareOffDay: () => {},
  },
} satisfies Meta<typeof PublicAwards>
export default meta
type Story = StoryObj<typeof meta>

export const Shared: Story = { globals: { theme: 'dark' } }
export const SharedLight: Story = { globals: { theme: 'light' } }
export const WithOffDay: Story = {
  args: {
    offDay: [
      {
        id: 'off-1',
        name: 'Ben Cruz',
        standing: { position: 16, of: 18, wins: 1, losses: 5 },
        reason: 'Below their usual results across their last 7 club sessions.',
        onShare: () => {},
      },
    ],
  },
}
export const OffDayEmpty: Story = { args: { offDay: [] } }
export const NoAwards: Story = { args: { mvp: null, mostImproved: null } }
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
