import { matchResultFixtures } from '@rotra/data/fixtures/match-results'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ConfirmResultSheet } from './ConfirmResultSheet'

// Match 1 of the live console fixture (doubles on Court 1) and the merged 5v5 on two courts.
const { doubles, fiveVFive } = matchResultFixtures

const meta = {
  title: 'Queue/ConfirmResultSheet',
  component: ConfirmResultSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    winningTeam: 'A',
    teamANames: doubles.teamANames,
    teamBNames: doubles.teamBNames,
    teamAScore: 31,
    teamBScore: 24,
    courtLabels: doubles.courtLabels,
    onConfirm: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof ConfirmResultSheet>

export default meta
type Story = StoryObj<typeof meta>

/** 16/31 review with a score: "31–24 (Team A–Team B)", Confirm Team A wins */
export const WithScore: Story = {}

/** A deuce game: "32–30 (Team A–Team B)" */
export const WithDeuceScore: Story = { args: { teamAScore: 32, teamBScore: 30 } }

/** Best of 3 with game scores: "2–1 · 21–18, 15–21, 21–19 (Team A–Team B)" */
export const WithGameScores: Story = {
  args: {
    teamAScore: 2,
    teamBScore: 1,
    games: [
      { a: 21, b: 18 },
      { a: 15, b: 21 },
      { a: 21, b: 19 },
    ],
  },
}

/** Best of 3 won 2–0 by Team B: "0–2 · 17–21, 22–24 (Team A–Team B)", Confirm Team B wins */
export const WithTwoGames: Story = {
  args: {
    winningTeam: 'B',
    teamAScore: 0,
    teamBScore: 2,
    games: [
      { a: 17, b: 21 },
      { a: 22, b: 24 },
    ],
  },
}

/** Review without a score: "No score entered", Confirm Team B wins */
export const WithoutScore: Story = {
  args: { winningTeam: 'B', teamAScore: null, teamBScore: null },
}

/** 5v5 on two courts: "Both courts will become available." */
export const FiveVFive: Story = {
  args: {
    teamANames: fiveVFive.teamANames,
    teamBNames: fiveVFive.teamBNames,
    teamAScore: null,
    teamBScore: null,
    courtLabels: fiveVFive.courtLabels,
  },
}

/** The commit is running: Confirm cannot fire twice, Back is blocked */
export const Pending: Story = { args: { isPending: true } }

/** The commit failed: nothing is claimed as saved */
export const Failed: Story = {
  args: { error: "You're offline, so nothing was saved. Try again once you're connected." },
}

/** The local save failed: the match stays active, the score stays, Confirm retries the same operation */
export const SaveFailed: Story = { args: { error: 'Changes could not be saved' } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }
export const LightGameScores: Story = {
  args: WithGameScores.args,
  globals: { theme: 'light' },
}
