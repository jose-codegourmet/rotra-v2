import type { MatchLineupFixture } from '@rotra/data/fixtures/match-lineups'
import { matchLineupFixtures } from '@rotra/data/fixtures/match-lineups'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SuggestedMatchSheet, type SuggestedMatchSheetProps } from './SuggestedMatchSheet'

const propsFor = (l: MatchLineupFixture): SuggestedMatchSheetProps => ({
  open: true,
  onOpenChange: fn(),
  lineup: { format: l.format, teamA: l.teamA, teamB: l.teamB },
  sessionMode: l.sessionMode,
  minimumGames: l.minimumGames,
  onSelectPlayer: fn(),
  onSwap: fn(),
  onSkip: fn(),
  onEditThenAdd: fn(),
  onAdd: fn(),
})

const meta = {
  title: 'Queue/SuggestedMatchSheet',
  component: SuggestedMatchSheet,
  args: propsFor(matchLineupFixtures.belowMinimum),
} satisfies Meta<typeof SuggestedMatchSheet>

export default meta
type Story = StoryObj<typeof meta>

export const AllBelowMinimum: Story = {}
export const SomeBelowMinimum: Story = { args: propsFor(matchLineupFixtures.someBelow) }
export const EveryoneMetMinimum: Story = { args: propsFor(matchLineupFixtures.everyoneMet) }
export const Singles: Story = { args: propsFor(matchLineupFixtures.singles) }
export const LongNames: Story = { args: propsFor(matchLineupFixtures.longNames) }
export const NoLineup: Story = {
  args: { lineup: null, reason: matchLineupFixtures.noLineupReason },
}
export const BothFormatsOff: Story = {
  args: { lineup: null, reason: matchLineupFixtures.bothFormatsOff },
}
export const Pending: Story = { args: { isPending: true } }
export const Phone: Story = {
  args: propsFor(matchLineupFixtures.someBelow),
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
