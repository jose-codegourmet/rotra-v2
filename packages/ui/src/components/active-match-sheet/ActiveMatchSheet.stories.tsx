import type { ActiveMatchFixture } from '@rotra/data/fixtures/active-matches'
import { activeMatchFixtures } from '@rotra/data/fixtures/active-matches'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ActiveMatchSheet, type ActiveMatchSheetProps } from './ActiveMatchSheet'

const propsFor = (m: ActiveMatchFixture): ActiveMatchSheetProps => ({
  open: true,
  onOpenChange: fn(),
  matchNo: m.matchNo,
  courtLabel: m.courtLabel,
  format: m.format,
  startedAt: m.startedAt,
  now: m.now,
  teamA: m.teamA,
  teamB: m.teamB,
  minimumGames: m.minimumGames,
  substitutions: m.substitutions,
  onSelectPlayer: fn(),
  onMarkInvalid: fn(),
  onSubstitute: fn(),
  onMatchDone: fn(),
})

const meta = {
  title: 'Queue/ActiveMatchSheet',
  component: ActiveMatchSheet,
  args: propsFor(activeMatchFixtures.doubles),
} satisfies Meta<typeof ActiveMatchSheet>

export default meta
type Story = StoryObj<typeof meta>

/** A doubles match on Court 1, 30 minutes in */
export const ActiveDoubles: Story = {}
/** A 5v5 fun game on both courts: "Court 1 + Court 2" */
export const MergedFiveVsFive: Story = { args: propsFor(activeMatchFixtures.merged) }
/** Two substitutions so far, one line each */
export const WithTwoSubstitutions: Story = {
  args: propsFor(activeMatchFixtures.withSubstitutions),
}
export const Phone: Story = {
  args: propsFor(activeMatchFixtures.withSubstitutions),
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
