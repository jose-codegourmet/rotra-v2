import { matchResultFixtures } from '@rotra/data/fixtures/match-results'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { MatchResultForm } from './MatchResultForm'

// Match 1 of the live console fixture: doubles on Court 1.
const { doubles } = matchResultFixtures

const meta = {
  title: 'Queue/MatchResultForm',
  component: MatchResultForm,
  args: {
    open: true,
    onOpenChange: fn(),
    matchNo: doubles.matchNo,
    teamANames: doubles.teamANames,
    teamBNames: doubles.teamBNames,
    onSubmit: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof MatchResultForm>

export default meta
type Story = StoryObj<typeof meta>

// The sheet is portaled to <body>, outside the story root.
const review: Story['play'] = async ({ canvasElement, userEvent }) => {
  const body = within(canvasElement.ownerDocument.body)
  await userEvent.click(await body.findByRole('button', { name: 'Review result' }))
}

/** Opens empty: no winner picked, no score, the hint under the fields */
export const Empty: Story = {}

/** Winner only: Team A picked, no score */
export const WinnerOnly: Story = { args: { defaultValues: { winner: 'A' } } }

/** Scores entered: 21–17, Clear scores shown; Review result sets Team A as the winner */
export const Scores: Story = { args: { defaultValues: { scoreA: '21', scoreB: '17' } } }

/** Review result with nothing chosen: "Pick a winner or enter the final score." */
export const NothingChosenError: Story = { play: review }

/** Only one score: "Enter both scores as whole numbers, or clear them." */
export const OneScoreError: Story = {
  args: { defaultValues: { scoreA: '21' } },
  play: review,
}

/** A fraction: "Enter both scores as whole numbers, or clear them." */
export const NotWholeNumberError: Story = {
  args: { defaultValues: { scoreA: '21.5', scoreB: '17' } },
  play: review,
}

/** A tie: "A tie can’t decide a winner. Correct the score, or clear it and pick a winner." */
export const TieError: Story = {
  args: { defaultValues: { scoreA: '20', scoreB: '20' } },
  play: review,
}

/** Score says Team B, Team A picked: "The score says Team B won, but Team A is picked. Fix one of them." */
export const ScoreDisagreesError: Story = {
  args: { defaultValues: { winner: 'A', scoreA: '17', scoreB: '21' } },
  play: review,
}

/** Clear scores empties both fields and brings the hint back */
export const ClearScores: Story = {
  args: { defaultValues: { scoreA: '21', scoreB: '17' } },
  play: async ({ canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(await body.findByRole('button', { name: 'Clear scores' }))
  },
}

export const Pending: Story = { args: { defaultValues: { winner: 'B' }, isPending: true } }

/** The result could not be taken further; what was typed stays */
export const ServerError: Story = {
  args: {
    defaultValues: { scoreA: '21', scoreB: '17' },
    serverError: 'This match already has a confirmed outcome or is not active.',
  },
}

export const Phone: Story = {
  args: { defaultValues: { scoreA: '21', scoreB: '17' } },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = {
  args: { defaultValues: { scoreA: '21', scoreB: '17' } },
  globals: { viewport: { value: 'desktop' } },
}
