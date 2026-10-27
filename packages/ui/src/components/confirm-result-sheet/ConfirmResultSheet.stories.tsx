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
    teamAScore: 21,
    teamBScore: 17,
    courtLabels: doubles.courtLabels,
    onConfirm: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof ConfirmResultSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Review with a score: "21–17 (Team A–Team B)", Confirm Team A wins */
export const WithScore: Story = {}

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
