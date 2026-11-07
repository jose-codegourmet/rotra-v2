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
    onOpenChange: fn(),
    matchNo: 3,
    inMatch,
    candidates,
    minimumGames: session.minimumGames,
    outId: null,
    inId: null,
    onPickOut: fn(),
    onPickIn: fn(),
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
