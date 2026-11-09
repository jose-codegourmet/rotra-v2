import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { MatchRequestCard, type MatchRequestSpot } from './MatchRequestCard'

const named = (role: MatchRequestSpot['role'], name: string, where?: string): MatchRequestSpot => ({
  role,
  player: { name, games: 3, minimumGames: 4, level: 'advanced_low', where },
})
const anyone = (role: MatchRequestSpot['role']): MatchRequestSpot => ({ role })
const spots = [
  named('Requester', 'Miguel Santos'),
  anyone('Partner'),
  named('Opponent', 'Rhea Villanueva', 'On Court 2'),
  named('Opponent', 'Paolo Reyes', 'In queue #1'),
]
const meta = {
  title: 'Queue/MatchRequestCard',
  component: MatchRequestCard,
  args: {
    requesterName: 'Miguel Santos',
    formatLabel: '2 v 2 doubles',
    requestedLabel: '7:21 PM',
    spots,
    onDecline: fn(),
    onAddToQueue: fn(),
  },
} satisfies Meta<typeof MatchRequestCard>
export default meta
type Story = StoryObj<typeof meta>
export const Doubles: Story = {}
export const Singles: Story = {
  args: { formatLabel: '1 v 1 singles', spots: [spots[0]!, anyone('Opponent')] },
}
export const OneVersusTwo: Story = {
  args: { formatLabel: '1 v 2 fun', spots: [spots[0]!, anyone('Opponent'), anyone('Opponent')] },
}
export const ThreeVersusThree: Story = {
  args: {
    formatLabel: '3 v 3 fun',
    spots: [
      spots[0]!,
      anyone('Partner'),
      anyone('Partner'),
      anyone('Opponent'),
      anyone('Opponent'),
      anyone('Opponent'),
    ],
  },
}
export const FourVersusFour: Story = {
  args: {
    formatLabel: '4 v 4 fun',
    spots: [
      spots[0]!,
      ...Array.from({ length: 3 }, () => anyone('Partner')),
      ...Array.from({ length: 4 }, () => anyone('Opponent')),
    ],
  },
}
export const FiveVersusFive: Story = {
  args: {
    formatLabel: '5 v 5 fun',
    spots: [
      spots[0]!,
      ...Array.from({ length: 4 }, () => anyone('Partner')),
      ...Array.from({ length: 5 }, () => anyone('Opponent')),
    ],
  },
}
export const Pending: Story = { args: { isPending: true } }
export const ErrorState: Story = {
  name: 'Error',
  args: { error: 'Could not add this request. Try again.' },
}
export const DoublesLight: Story = { globals: { theme: 'light' } }
export const SinglesLight: Story = { ...Singles, globals: { theme: 'light' } }
export const OneVersusTwoLight: Story = { ...OneVersusTwo, globals: { theme: 'light' } }
export const ThreeVersusThreeLight: Story = { ...ThreeVersusThree, globals: { theme: 'light' } }
export const FourVersusFourLight: Story = { ...FourVersusFour, globals: { theme: 'light' } }
export const FiveVersusFiveLight: Story = { ...FiveVersusFive, globals: { theme: 'light' } }
export const PendingLight: Story = { ...Pending, globals: { theme: 'light' } }
export const ErrorLight: Story = { ...Error, globals: { theme: 'light' } }
