import type { CourtPlayer } from '@rotra/ui/court-drawing'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ConfirmMakeMatchSheet } from './ConfirmMakeMatchSheet'

const players: CourtPlayer[] = Array.from({ length: 10 }, (_, i) => ({
  id: `${i}`,
  name: `Player ${i + 1}`,
  shortName: `Player ${i + 1}`,
  level: i === 0 ? null : i % 2 ? 'intermediate_mid' : 'advanced_low',
  games: i % 4,
}))
const meta = {
  title: 'Queue/ConfirmMakeMatchSheet',
  component: ConfirmMakeMatchSheet,
  args: {
    open: true,
    teamA: players.slice(0, 2),
    teamB: players.slice(2, 4),
    formatLabel: 'Doubles',
    levelA: 8,
    levelB: 10,
    arranged: false,
    onArrange: fn(),
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ConfirmMakeMatchSheet>
export default meta
type Story = StoryObj<typeof meta>
export const Doubles: Story = {}
export const Singles: Story = {
  args: { teamA: players.slice(0, 1), teamB: players.slice(1, 2), formatLabel: 'Singles' },
}
export const OneVersusTwo: Story = {
  args: { teamA: players.slice(0, 1), teamB: players.slice(1, 3), formatLabel: '1v2 fun' },
}
export const ThreeVersusThree: Story = {
  args: { teamA: players.slice(0, 3), teamB: players.slice(3, 6), formatLabel: '3v3 fun' },
}
export const FourVersusFour: Story = {
  args: { teamA: players.slice(0, 4), teamB: players.slice(4, 8), formatLabel: '4v4 fun' },
}
export const FiveVersusFive: Story = {
  args: { teamA: players.slice(0, 5), teamB: players.slice(5, 10), formatLabel: '5v5 fun' },
}
export const Arranged: Story = { args: { arranged: true, levelA: 9, levelB: 9 } }
export const Pending: Story = { args: { isPending: true } }
export const Error: Story = { args: { error: 'Could not make the match. Try again.' } }
export const DoublesLight: Story = { globals: { theme: 'light' } }
export const SinglesLight: Story = { ...Singles, globals: { theme: 'light' } }
export const OneVersusTwoLight: Story = { ...OneVersusTwo, globals: { theme: 'light' } }
export const ThreeVersusThreeLight: Story = { ...ThreeVersusThree, globals: { theme: 'light' } }
export const FourVersusFourLight: Story = { ...FourVersusFour, globals: { theme: 'light' } }
export const FiveVersusFiveLight: Story = { ...FiveVersusFive, globals: { theme: 'light' } }
export const ArrangedLight: Story = { ...Arranged, globals: { theme: 'light' } }
export const PendingLight: Story = { ...Pending, globals: { theme: 'light' } }
export const ErrorLight: Story = { ...Error, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
