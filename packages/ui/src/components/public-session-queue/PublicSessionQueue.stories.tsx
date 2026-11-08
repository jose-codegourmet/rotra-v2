import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PublicSessionQueue } from './PublicSessionQueue'

const meta = {
  title: 'Queue/PublicSession/PublicSessionQueue',
  component: PublicSessionQueue,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[760px]">
        <Story />
      </div>
    ),
  ],
  args: { access: null, loginHref: 'https://player.rotra.club/login', onRetry: fn() },
} satisfies Meta<typeof PublicSessionQueue>
export default meta
type Story = StoryObj<typeof meta>
/** Every story supports dark and light via the theme toolbar. */
export const SignedOut: Story = {}
export const Checking: Story = { args: { checking: true } }
export const Failed: Story = { args: { failed: true } }
export const Empty: Story = {
  args: { access: { playerId: 'fixture', fullRoster: false, participants: [], queue: [] } },
}
export const WaitingQueue: Story = {
  args: {
    access: {
      playerId: 'fixture',
      fullRoster: false,
      participants: [],
      queue: [
        {
          matchNo: 1,
          format: 'doubles',
          teamA: [
            { name: 'J*** A***', level: 'intermediate_mid' },
            { name: 'M***', level: 'beginner_mid' },
          ],
          teamB: [
            { name: 'K***', level: 'intermediate_low' },
            { name: 'A***', level: 'advanced_low' },
          ],
        },
      ],
    },
  },
}
