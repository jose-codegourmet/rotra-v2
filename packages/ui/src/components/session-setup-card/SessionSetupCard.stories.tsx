import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionSetupCard } from './SessionSetupCard'

const meta = {
  title: 'Queue/SessionSetupCard',
  component: SessionSetupCard,
  decorators: [
    (Story) => (
      <div className="max-w-[480px]">
        <Story />
      </div>
    ),
  ],
  args: {
    courtLabels: ['Court 1', 'Court 2', 'Court 3', 'Court 4'],
    formatsLabel: 'Doubles',
    modeLabel: 'Fair',
    modeDescription: 'Mainly level-matched games, roughly 10% easy games.',
    minimumGames: 4,
    minimum: {
      kind: 'calculated',
      players: 17,
      usableCourts: 4,
      durationLabel: '3 h',
      low: 4,
      high: 6,
    },
    rosterCount: 17,
    presentCount: 13,
  },
} satisfies Meta<typeof SessionSetupCard>

export default meta
type Story = StoryObj<typeof meta>

export const Calculated: Story = {}
export const SetByYou: Story = {
  args: { minimumGames: 5, minimum: { kind: 'set', low: 4, high: 6 } },
}
export const WithCosts: Story = {
  args: {
    extraRows: [{ label: 'Costs', value: '₱3,060 estimated · ₱219 a player to break even' }],
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
