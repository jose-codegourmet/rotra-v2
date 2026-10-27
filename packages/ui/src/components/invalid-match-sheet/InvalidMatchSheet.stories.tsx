import { matchResultFixtures } from '@rotra/data/fixtures/match-results'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { InvalidMatchSheet } from './InvalidMatchSheet'

// Match 1 of the live console fixture (doubles on Court 1) and the merged 5v5 on two courts.
const { doubles, fiveVFive } = matchResultFixtures

const meta = {
  title: 'Queue/InvalidMatchSheet',
  component: InvalidMatchSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    matchNo: doubles.matchNo,
    courtLabels: doubles.courtLabels,
    teamA: doubles.teamA,
    teamB: doubles.teamB,
    minimumGames: doubles.minimumGames,
    onSelectPlayer: fn(),
    onConfirm: fn(),
    onKeepPlaying: fn(),
  },
} satisfies Meta<typeof InvalidMatchSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Doubles on Court 1 */
export const Doubles: Story = {}

/** 5v5 on Court 1 + Court 2: confirming frees both courts */
export const FiveVFive: Story = {
  args: {
    matchNo: fiveVFive.matchNo,
    courtLabels: fiveVFive.courtLabels,
    teamA: fiveVFive.teamA,
    teamB: fiveVFive.teamB,
  },
}

/** The commit is running: Confirm cannot fire twice, Keep playing is blocked */
export const Pending: Story = { args: { isPending: true } }

/** The local save failed: the match stays active and its court in use, Confirm retries the same operation */
export const SaveFailed: Story = { args: { error: 'Changes could not be saved' } }

/** The commit failed: the match stays active */
export const Failed: Story = {
  args: { error: "You're offline, so nothing was saved. Try again once you're connected." },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
