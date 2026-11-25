import { matchResultFixtures } from '@rotra/data/fixtures/match-results'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { MatchResultForm } from './MatchResultForm'
import type { GameRowInput } from './MatchResultForm.schema'

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
    scoring: '31',
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

/** A best-of-3 game row: who won it, the losing box, or Deuce on with both boxes */
/** A game row: its winner's box at 21 (or the two `typed` boxes), the other box `lose` */
const game = (
  winner: GameRowInput['winner'],
  lose = '',
  typed?: { a: string; b: string },
): GameRowInput => ({
  winner,
  a: typed?.a ?? (winner === 'A' ? '21' : winner ? lose : ''),
  b: typed?.b ?? (winner === 'B' ? '21' : winner ? lose : ''),
})

const rows = (...picked: GameRowInput[]) =>
  [0, 1, 2].map((i) => picked[i] ?? game(null)) as GameRowInput[]

// ---- One game: 16/31 (the default) ----

/** Opens with both boxes blank and typeable; no deuce switch (owner, November 25, 2026) */
export const Empty: Story = {}

/** Team A picked: Team A's box holds 31 and is green (still editable) */
export const WinnerPicked: Story = {
  args: { defaultValues: { winner: 'A', scoreA: '31' } },
}

/** 31–24, Clear score shown */
export const LosingScore: Story = {
  args: { defaultValues: { winner: 'A', scoreA: '31', scoreB: '24' } },
}

/** Team B won 31–27 */
export const TeamBWins: Story = {
  args: { defaultValues: { winner: 'B', scoreA: '27', scoreB: '31' } },
}

/** Deuce: the green box raised to 32, 32–30 */
export const Deuce: Story = {
  args: { defaultValues: { winner: 'A', scoreA: '32', scoreB: '30' } },
}

/** Review result with nothing chosen: "Pick the winner." */
export const PickWinnerError: Story = { play: review }

/** Typing the scores picks the winner: 30–32 picks Team B */
export const ScoresPickWinner: Story = {
  args: { defaultValues: { scoreA: '30', scoreB: '32' } },
}

/** 31–31: "A game can't end level. One pair needs 31." */
export const LevelError: Story = {
  args: { defaultValues: { winner: 'A', scoreA: '31', scoreB: '31' } },
  play: review,
}

/** 31–30: "At 30–30 the game goes to deuce: the winner needs a 2-point lead, like 32–30." */
export const GoesToDeuceError: Story = {
  args: { defaultValues: { winner: 'A', scoreA: '31', scoreB: '30' } },
  play: review,
}

/** 33–30: "Enter a finished game: 31 against 0 to 29, or past 30–30 a 2-point lead, like 32–30." */
export const DeuceLeadError: Story = {
  args: { defaultValues: { winner: 'A', scoreA: '33', scoreB: '30' } },
  play: review,
}

/** Only the loser's box: "Enter both scores, or clear them." */
export const BothScoresError: Story = {
  args: { defaultValues: { winner: 'A', scoreB: '24' } },
  play: review,
}

/** Clear score empties the boxes and brings the hint back */
export const ClearScore: Story = {
  args: { defaultValues: { winner: 'A', scoreA: '31', scoreB: '24' } },
  play: async ({ canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(await body.findByRole('button', { name: 'Clear score' }))
  },
}

// ---- One game: 16/31, no deuce ----

/** 31–30 is a finished game without deuce */
export const NoDeuce: Story = {
  args: { scoring: '31nd', defaultValues: { winner: 'A', scoreA: '31', scoreB: '30' } },
}

/** 32–30: "The winner has 31 and the other pair 0 to 30." */
export const NoDeuceRangeError: Story = {
  args: { scoring: '31nd', defaultValues: { winner: 'A', scoreA: '32', scoreB: '30' } },
  play: review,
}

// ---- One game: 11/21 ----

/** "Game to 21. … Past 20–20, change the green box too, like 22–20." */
export const To21: Story = {
  args: { scoring: '21', defaultValues: { winner: 'B', scoreA: '17', scoreB: '21' } },
}

/** Deuce in 11/21: 22–24 */
export const To21Deuce: Story = {
  args: { scoring: '21', defaultValues: { winner: 'B', scoreA: '22', scoreB: '24' } },
}

/** "At 20–20 the game goes to deuce: the winner needs a 2-point lead, like 22–20." */
export const To21GoesToDeuceError: Story = {
  args: { scoring: '21', defaultValues: { winner: 'B', scoreA: '20', scoreB: '21' } },
  play: review,
}

// ---- Best of 3: 11/21 × 3 ----

/** Pick the winner, OR, Enter each game with Game 1 and Game 2, each a Team A / Team B pick and two boxes */
export const BestOf3Empty: Story = { args: { scoring: '21x3' } }

/** Winner only: Team B picked, no game entered (still confirms) */
export const BestOf3WinnerOnly: Story = {
  args: { scoring: '21x3', defaultValues: { winner: 'B' } },
}

/** One game picked: "Games won · Team A 1 – 0 Team B" */
export const BestOf3OneGame: Story = {
  args: { scoring: '21x3', defaultValues: { games: rows(game('A', '18')) } },
}

/** 2–0: two rows, the top pick follows the games */
export const BestOf3TwoNil: Story = {
  args: {
    scoring: '21x3',
    defaultValues: { winner: 'A', games: rows(game('A', '18'), game('A', '15')) },
  },
}

/** 2–1: Game 3 shows after the split; Game 3 went to deuce (23–21) */
export const BestOf3TwoOne: Story = {
  args: {
    scoring: '21x3',
    defaultValues: {
      winner: 'A',
      games: rows(game('A', '18'), game('B', '15'), game('A', '', { a: '23', b: '21' })),
    },
  },
}

/** "Pick who won each game. One pair must win 2 games to decide the match." */
export const BestOf3UndecidedError: Story = {
  args: { scoring: '21x3', defaultValues: { games: rows(game('A', '18')) } },
  play: review,
}

/** The top pick disagrees: "The games say Team A won, but Team B is picked. Fix one of them." */
export const BestOf3GamesDisagreeError: Story = {
  args: {
    scoring: '21x3',
    defaultValues: { winner: 'B', games: rows(game('A', '18'), game('A', '15')) },
  },
  play: review,
}

/** A row with no score: "Enter a score for every game played, or clear them all." */
export const BestOf3MissingScoreError: Story = {
  args: {
    scoring: '21x3',
    defaultValues: { winner: 'A', games: rows(game('A', '18'), game('A')) },
  },
  play: review,
}

/** "Game 2: At 20–20 the game goes to deuce: the winner needs a 2-point lead, like 22–20." */
export const BestOf3GoesToDeuceError: Story = {
  args: {
    scoring: '21x3',
    defaultValues: { winner: 'A', games: rows(game('A', '18'), game('A', '20')) },
  },
  play: review,
}

/** "Game 1: Enter a finished game: 21 against 0 to 19, or past 20–20 a 2-point lead, like 22–20." */
export const BestOf3DeuceLeadError: Story = {
  args: {
    scoring: '21x3',
    defaultValues: {
      winner: 'A',
      games: rows(game('A', '', { a: '24', b: '20' }), game('A', '15')),
    },
  },
  play: review,
}

/** Clear scores empties every game's boxes; the Team A / Team B picks stay */
export const BestOf3ClearScores: Story = {
  args: {
    scoring: '21x3',
    defaultValues: { winner: 'A', games: rows(game('A', '18'), game('A', '15')) },
  },
  play: async ({ canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(await body.findByRole('button', { name: 'Clear scores' }))
  },
}

// ---- Best of 3: 21 × 3 (no deuce) ----

/** 21 × 3 has no deuce; 2–1 with a 21–20 game */
export const BestOf3NoDeuce: Story = {
  args: {
    scoring: '21x3nd',
    defaultValues: {
      winner: 'B',
      games: rows(game('B', '20'), game('A', '12'), game('B', '16')),
    },
  },
}

/** "Game 2: The winner has 21 and the other pair 0 to 20." */
export const BestOf3NoDeuceRangeError: Story = {
  args: {
    scoring: '21x3nd',
    defaultValues: {
      winner: 'A',
      games: rows(game('A', '18'), game('A', '', { a: '23', b: '21' })),
    },
  },
  play: review,
}

// ---- Shared states ----

export const Pending: Story = { args: { defaultValues: { winner: 'B' }, isPending: true } }

/** The result could not be taken further; what was typed stays */
export const ServerError: Story = {
  args: {
    defaultValues: { winner: 'A', scoreA: '31', scoreB: '24' },
    serverError: 'This match already has a confirmed outcome or is not active.',
  },
}

export const Phone: Story = {
  args: { defaultValues: { winner: 'A', scoreA: '31', scoreB: '24' } },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = {
  args: { defaultValues: { winner: 'A', scoreA: '31', scoreB: '24' } },
  globals: { viewport: { value: 'desktop' } },
}
export const PhoneBestOf3: Story = {
  args: BestOf3TwoOne.args,
  globals: { viewport: { value: 'phone' } },
}
export const Light: Story = {
  args: { defaultValues: { winner: 'A', scoreA: '31', scoreB: '24' } },
  globals: { theme: 'light' },
}
export const LightDeuce: Story = { args: Deuce.args, globals: { theme: 'light' } }
export const LightBestOf3: Story = { args: BestOf3TwoOne.args, globals: { theme: 'light' } }
export const LightError: Story = {
  args: BestOf3GoesToDeuceError.args,
  play: review,
  globals: { theme: 'light' },
}
