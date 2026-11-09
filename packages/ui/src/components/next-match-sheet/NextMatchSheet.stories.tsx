import { startMatchFixtures } from '@rotra/data/fixtures/start-match'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { type NextMatchCandidate, NextMatchSheet } from './NextMatchSheet'

// The Pick another fixture's waiting matches for its free court, as picker candidates.
const { chooseMatch } = startMatchFixtures
const candidates: NextMatchCandidate[] = chooseMatch.rows.map(
  ({ matchId, position, teamA, teamB, formatLabel }) => ({
    matchId,
    position,
    teamA,
    teamB,
    formatLabel,
  }),
)

const meta = {
  title: 'Queue/NextMatchSheet',
  component: NextMatchSheet,
  args: {
    open: true,
    courtLabel: chooseMatch.courtLabel,
    matchNo: 4,
    candidates: candidates.slice(0, 2),
    onPick: fn(),
    onSkip: fn(),
  },
} satisfies Meta<typeof NextMatchSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Two equal options, Left and Right; on a touch screen the pair can be swiped. */
export const TwoCandidates: Story = {}

/** One ready match: one full-width card, no swipe and no hint. */
export const OneCandidate: Story = { args: { candidates: candidates.slice(0, 1) } }

/** Nothing ready for the court: the honest notice and only Close. */
export const NoCandidates: Story = { args: { candidates: [] } }

/** The picked match stopped being ready: the error, with refreshed candidates. */
export const PickError: Story = {
  args: { error: 'That match is not ready any more. Pick again.' },
}

/** The placement is running. */
export const Pending: Story = { args: { isPending: true } }

export const Light: Story = { globals: { theme: 'light' } }
export const LightOneCandidate: Story = {
  args: { candidates: candidates.slice(0, 1) },
  globals: { theme: 'light' },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { viewport: { value: 'phone' }, theme: 'light' } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
