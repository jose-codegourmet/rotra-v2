import type { MatchLineupFixture } from '@rotra/data/fixtures/match-lineups'
import { matchLineupFixtures } from '@rotra/data/fixtures/match-lineups'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
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
  onReshuffle: fn(),
  onReplace: fn(),
  onBack: fn(),
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
function ReshuffleDemo(args: SuggestedMatchSheetProps) {
  const [key, setKey] = useState(0)
  const { lineup } = args
  return (
    <SuggestedMatchSheet
      {...args}
      dealKey={key}
      lineup={key % 2 && lineup ? { ...lineup, teamA: [...lineup.teamA].reverse() } : lineup}
      onReshuffle={() => setKey((k) => k + 1)}
    />
  )
}

/** After Reshuffle: a new dealKey deals the faces back in (press Reshuffle to see it). */
export const AfterReshuffle: Story = {
  args: propsFor(matchLineupFixtures.everyoneMet),
  render: (args) => <ReshuffleDemo {...args} />,
}
export const Pending: Story = { args: { isPending: true } }
export const Phone: Story = {
  args: propsFor(matchLineupFixtures.someBelow),
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const PhoneLight: Story = {
  args: propsFor(matchLineupFixtures.someBelow),
  globals: { viewport: { value: 'phone' }, theme: 'light' },
}
export const DesktopLight: Story = { globals: { viewport: { value: 'desktop' }, theme: 'light' } }
