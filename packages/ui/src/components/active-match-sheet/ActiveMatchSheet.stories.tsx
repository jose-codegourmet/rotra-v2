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
  onAlmostDoneChange: fn(),
  freeCourtCount: 2,
  onMoveToFree: fn(),
  onSelectPlayer: fn(),
  onOpenProfile: fn(),
  onSwapPartners: fn(),
  onMarkInvalid: fn(),
  onMatchDone: fn(),
})

const meta = {
  title: 'Queue/ActiveMatchSheet',
  component: ActiveMatchSheet,
  args: propsFor(activeMatchFixtures.doubles),
} satisfies Meta<typeof ActiveMatchSheet>

export default meta
type Story = StoryObj<typeof meta>

/** A doubles match on Court 1, 30 minutes in: the head row (#N, format pill, time pill, status pill), Started, Almost done */
export const ActiveDoubles: Story = {}
/** Owner, November 26, 2026: the status pill follows the court card (Playing, Ending, Ending soon, Running long in warn) */
export const StatusEnding: Story = {
  args: { status: { label: 'Ending', tone: 'accent', title: 'Ends in about 4 min' } },
}
/** Almost done on: the switch is checked and the status reads Ending soon (hover: Almost done) */
export const AlmostDoneOn: Story = {
  args: {
    almostDone: true,
    status: { label: 'Ending soon', tone: 'accent', title: 'Almost done' },
  },
}
export const AlmostDoneOnLight: Story = { ...AlmostDoneOn, globals: { theme: 'light' } }
export const StatusRunningLong: Story = {
  args: { status: { label: 'Ending soon', tone: 'warn', title: 'Running long' } },
}
export const StatusEndingLight: Story = { ...StatusEnding, globals: { theme: 'light' } }
/** Playing: drag a player onto someone in the other pair to swap partners; the card opens Change NAME?, the picture the profile. */
export const SwapPartners: Story = { args: { onSwapPartners: fn() } }
/** Move to a free court is disabled with "No court is free". */
export const NoFreeCourt: Story = { args: { freeCourtCount: 0 } }
/** A 5v5 fun game on both courts: "Court 1 + Court 2" */
export const MergedFiveVsFive: Story = { args: propsFor(activeMatchFixtures.merged) }
const { withSubstitutions } = activeMatchFixtures
const [firstSub, secondSub] = withSubstitutions.substitutions

/** Two substitutions so far, neither credited (the usual case) */
export const WithTwoSubstitutions: Story = {
  args: propsFor(withSubstitutions),
}
/** Incoming player credited: "NAME replaced NAME · NAME got the game (QM choice)" */
export const WithCreditedIncoming: Story = {
  args: {
    ...propsFor(withSubstitutions),
    substitutions:
      firstSub && secondSub ? [{ ...firstSub, creditTo: 'incoming' as const }, secondSub] : [],
  },
}
/** Outgoing player credited on the second substitution */
export const WithCreditedOutgoing: Story = {
  args: {
    ...propsFor(withSubstitutions),
    substitutions:
      firstSub && secondSub ? [firstSub, { ...secondSub, creditTo: 'outgoing' as const }] : [],
  },
}
/** The line ends "· Scoring · <label>". */
export const ScoringBestOfThree: Story = { args: { scoringLabel: '11/21 × 3' } }
export const ScoringBestOfThreeLight: Story = {
  ...ScoringBestOfThree,
  globals: { theme: 'light' },
}
export const Phone: Story = {
  args: propsFor(activeMatchFixtures.withSubstitutions),
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
