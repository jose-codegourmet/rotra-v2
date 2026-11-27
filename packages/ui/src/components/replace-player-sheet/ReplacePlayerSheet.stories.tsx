import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import { countedGames } from '@rotra/data/match/match.rules'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { type ReplacePlayer, ReplacePlayerSheet } from './ReplacePlayerSheet'

const { session, roster, matches } = consoleSessionFixture
const tile = (i: number): ReplacePlayer => {
  const p = roster[i]
  if (!p) throw new Error('Roster fixture missing')
  return {
    id: p.id,
    name: p.nameSnapshot,
    level: p.level,
    games: countedGames(p.id, matches),
    restMinutes: 6 + i,
  }
}

const inMatch = [0, 1, 2, 3].map((i) => ({
  ...tile(i),
  team: i < 2 ? ('A' as const) : ('B' as const),
  present: i !== 3,
}))
const candidates = [8, 9, 10].map(tile)

const meta = {
  title: 'Queue/ReplacePlayerSheet',
  component: ReplacePlayerSheet,
  args: {
    open: true,
    matchNo: 3,
    inMatch,
    candidates,
    minimumGames: session.minimumGames,
    outId: null,
    inId: null,
    onPickOut: fn(),
    onPickIn: fn(),
    onPickSwap: fn(),
    onSwapFromMatch: fn(),
    onBack: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof ReplacePlayerSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Nothing chosen: Replace player is disabled. */
export const NothingChosen: Story = {}

/** Both chosen. */
export const BothChosen: Story = {
  args: { outId: inMatch[3]?.id ?? null, inId: candidates[0]?.id ?? null },
}

/** Nobody present is free. */
export const NoReplacement: Story = { args: { candidates: [] } }

/** Replace player is saving: it cannot fire twice. */
export const Pending: Story = {
  args: { outId: inMatch[3]?.id ?? null, inId: candidates[0]?.id ?? null, isPending: true },
}

/** The recheck refused the change. */
export const SomethingChanged: Story = {
  args: { message: 'Something changed. Review the match again.' },
}

/** The local save failed. */
export const SaveFailed: Story = { args: { error: 'Changes could not be saved' } }

export const BothChosenLight: Story = {
  args: { outId: inMatch[3]?.id ?? null, inId: candidates[0]?.id ?? null },
  globals: { theme: 'light' },
}

export const Phone: Story = {
  args: { outId: inMatch[3]?.id ?? null, inId: candidates[0]?.id ?? null },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
/** During play Replace fixes a mistake: the notice replaces the lineup-change line */
export const Playing: Story = {
  args: { playing: true, outId: inMatch[0]?.id ?? null, inId: candidates[0]?.id ?? null },
}

/** Swap from match offered, no one coming out yet: the row says to choose first */
export const SwapNoOneChosen: Story = {}

/** Someone is coming out: their two opponents are listed, marked Team B · opponent */
export const SwapOpponentsListed: Story = { args: { outId: inMatch[0]?.id ?? null } }

/** An opponent is picked: the primary button becomes Swap players with the note */
export const SwapOpponentPicked: Story = {
  args: { outId: inMatch[0]?.id ?? null, swapId: inMatch[2]?.id ?? null },
}

export const SwapOpponentPickedLight: Story = {
  ...SwapOpponentPicked,
  globals: { theme: 'light' },
}

/** Singles: one opponent */
export const SwapSingles: Story = {
  args: {
    inMatch: [inMatch[0], inMatch[2]].flatMap((p) => (p ? [{ ...p, present: true }] : [])),
    outId: inMatch[0]?.id ?? null,
    swapId: inMatch[2]?.id ?? null,
  },
}

/** A Suggestion player is picked: a plain replace, with Replace player */
export const SwapRowPlainReplace: Story = {
  args: { outId: inMatch[0]?.id ?? null, inId: candidates[0]?.id ?? null },
}

/** Playing: the swap row shows too, with the Replace notice until an opponent is picked */
export const SwapPlaying: Story = {
  args: { playing: true, outId: inMatch[0]?.id ?? null },
}

/** Replace a player in the suggested match: the tapped player is already coming out, no match number. */
export const SuggestedMatch: Story = {
  args: {
    matchNo: undefined,
    title: 'Replace a player in the suggested match',
    note: 'This only changes the suggested lineup. Nothing is recorded until you add it to the queue.',
    backLabel: 'Back to the suggested match',
    outId: inMatch[0]?.id ?? null,
  },
}

export const SuggestedMatchLight: Story = {
  ...SuggestedMatch,
  globals: { theme: 'light' },
}

export const SuggestedMatchPhone: Story = {
  ...SuggestedMatch,
  globals: { viewport: { value: 'phone' } },
}
