import { matchLineupFixtures } from '@rotra/data/fixtures/match-lineups'
import { toggleBaggingGame } from '@rotra/data/match/auto-queue-rules'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, within } from 'storybook/test'
import {
  type AutoQueueBaggingProps,
  type AutoQueueCount,
  type AutoQueueMode,
  AutoQueueWorkspace,
  type AutoQueueWorkspaceProps,
  type QueueWorkspace,
} from './AutoQueueWorkspace'

const fixture = matchLineupFixtures.autoQueueWorkspace
const baggingFixture = matchLineupFixtures.bagging

/** Bagging mode props with the switch and the pairs list held in story state. */
function useBaggingDemo(initial: AutoQueueBaggingProps | undefined) {
  const [enabled, setEnabled] = useState(initial?.enabled ?? false)
  const [pairs, setPairs] = useState(initial?.pairs ?? [])
  if (!initial) return undefined
  const bagging: AutoQueueBaggingProps = {
    ...initial,
    enabled,
    pairs,
    onEnabledChange: (next) => {
      initial.onEnabledChange(next)
      setEnabled(next)
    },
    onAddPair: (pair) => {
      initial.onAddPair(pair)
      const a = baggingFixture.players.find((p) => p.id === pair.a),
        b = baggingFixture.players.find((p) => p.id === pair.b)
      if (a && b)
        setPairs((current) => [
          ...current.filter((p) => ![pair.a, pair.b].some((id) => p.a.id === id || p.b.id === id)),
          { id: `bagging-${pair.a}-${pair.b}`, a, b, games: pair.games },
        ])
    },
    onToggleGame: (pairId, value) => {
      initial.onToggleGame(pairId, value)
      setPairs((current) =>
        current.map((p) =>
          p.id === pairId
            ? { ...p, games: toggleBaggingGame(p.games, value, baggingFixture.minimumGames) }
            : p,
        ),
      )
    },
    onRemovePair: (pairId) => {
      initial.onRemovePair(pairId)
      setPairs((current) => current.filter((p) => p.id !== pairId))
    },
  }
  return bagging
}
const baggingArgs = (enabled: boolean, pairs = baggingFixture.pairs): AutoQueueBaggingProps => ({
  enabled,
  pairs,
  players: baggingFixture.players,
  onEnabledChange: fn(),
  onAddPair: fn(),
  onToggleGame: fn(),
  onRemovePair: fn(),
})

function Demo(args: AutoQueueWorkspaceProps) {
  const [workspace, setWorkspace] = useState<QueueWorkspace>(args.workspace)
  const [mode, setMode] = useState<AutoQueueMode>(args.mode)
  const [count, setCount] = useState<AutoQueueCount | null>(args.count)
  const [target, setTarget] = useState(args.catchUpTarget)
  const [batches, setBatches] = useState(args.batches)
  const [selected, setSelected] = useState(args.selectedIds)
  const bagging = useBaggingDemo(args.bagging)
  return (
    <AutoQueueWorkspace
      {...args}
      bagging={bagging}
      workspace={workspace}
      onWorkspaceChange={setWorkspace}
      mode={mode}
      onModeChange={setMode}
      count={count}
      onCountChange={setCount}
      catchUpTarget={target}
      onCatchUpTargetChange={setTarget}
      batches={batches}
      selectedIds={selected}
      onSelect={(id, checked) =>
        setSelected((current) =>
          checked ? [...current, id] : current.filter((item) => item !== id),
        )
      }
      onUnselectAll={() => setSelected([])}
      onClear={(tab) => {
        setSelected((current) =>
          current.filter((id) => !(batches[tab]?.drafts ?? []).some((draft) => draft.id === id)),
        )
        setBatches((current) => ({ ...current, [tab]: { drafts: [] } }))
      }}
      onClearUnselected={(tab) =>
        setBatches((current) => ({
          ...current,
          [tab]: {
            ...current[tab],
            stopReason: undefined,
            drafts: (current[tab]?.drafts ?? []).filter((draft) => selected.includes(draft.id)),
          },
        }))
      }
      onRegenerateUnselected={(tab) =>
        setBatches((current) => ({
          ...current,
          [tab]: {
            ...current[tab],
            drafts: (current[tab]?.drafts ?? []).filter((draft) => selected.includes(draft.id)),
          },
        }))
      }
      onAddToMainQueue={(ids) => {
        args.onAddToMainQueue(ids)
        setSelected((current) => current.filter((id) => !ids.includes(id)))
      }}
    />
  )
}

const meta = {
  title: 'Queue/AutoQueueWorkspace',
  component: AutoQueueWorkspace,
  args: {
    workspace: 'auto',
    onWorkspaceChange: fn(),
    mainQueue: (
      <div className="rounded-lg border border-border p-4 text-fg">
        Queued matches · Main Queue controls remain here.
      </div>
    ),
    mode: 'available',
    onModeChange: fn(),
    count: null,
    onCountChange: fn(),
    minimumGames: matchLineupFixtures.session.minimumGames,
    hasEligiblePlayers: true,
    catchUpTarget: '',
    onCatchUpTargetChange: fn(),
    batches: fixture,
    selectedIds: [],
    onSelect: fn(),
    onUnselectAll: fn(),
    onGenerate: fn(),
    onRegenerate: fn(),
    onRegenerateUnselected: fn(),
    onClear: fn(),
    onClearUnselected: fn(),
    onAddToMainQueue: fn(),
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof AutoQueueWorkspace>

export default meta
type Story = StoryObj<typeof meta>

export const Generated: Story = { args: { count: 2 } }
export const Empty: Story = { args: { batches: {} } }
export const MainQueue: Story = { args: { workspace: 'main' } }
export const CrossTabSelected: Story = {
  args: { selectedIds: ['draft-available-1', 'draft-ahead-1'] },
}
export const Stale: Story = {
  args: { batches: { ...fixture, available: { ...fixture.available, stale: true } } },
}
export const BlockedPlayer: Story = { args: { mode: 'ahead' } }
/** Drafts picked across tabs: badges show pick order, the selection bar shows their players. */
export const SelectedDrafts: Story = {
  args: { count: 2, selectedIds: ['draft-available-2', 'draft-available-1'] },
}
/** Tap a tile to pick it, Space to pick the next, then Clear in the bar. */
export const PickByTapAndKeyboard: Story = {
  args: { count: 2 },
  play: async ({ canvas, userEvent }) => {
    const tiles = canvas.getAllByRole('button', { name: /^Draft Doubles/ })
    await userEvent.click(tiles[0] as HTMLElement)
    ;(canvas.getAllByRole('button', { name: /^Draft Doubles/ })[1] as HTMLElement).focus()
    await userEvent.keyboard(' ')
    await expect(canvas.getByRole('button', { name: /picked 2$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(canvas.getByRole('button', { name: 'Add 2 to Main Queue' })).toBeEnabled()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }))
    await expect(canvas.getByRole('button', { name: 'Add 0 to Main Queue' })).toBeDisabled()
  },
}
export const PendingTransfer: Story = {
  args: { selectedIds: ['draft-available-1'], isPending: true },
}
export const Failure: Story = {
  args: {
    batches: {
      ...fixture,
      available: { drafts: [], error: 'Could not generate drafts. Try again.' },
    },
  },
}
export const CatchUp: Story = { args: { mode: 'catchup', count: 2, catchUpTarget: '3' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }

export const InvalidCatchUpTarget: Story = {
  args: { mode: 'catchup', count: 2, catchUpTarget: '1.5' },
}
export const Generating: Story = { args: { isPending: true, pendingMessage: 'Generating drafts…' } }
export const TransferConflict: Story = {
  args: {
    selectedIds: ['draft-available-1'],
    transferError: 'A selected player is no longer present.',
    onAddToMainQueue: fn(async () => false),
  },
}

export const CatchUpWithoutTarget: Story = {
  args: { mode: 'catchup', count: 2, batches: {} },
}
export const NoEligiblePlayers: Story = {
  args: { count: 2, batches: {}, hasEligiblePlayers: false },
}
export const NoPresentPlayers: Story = {
  args: { mode: 'ahead', count: 2, batches: {}, hasEligiblePlayers: false },
}
export const ShortBatch: Story = {
  args: { count: 2, batches: { available: matchLineupFixtures.autoQueueCopyStates.shortBatch } },
}
export const CatchUpTargetMet: Story = {
  args: {
    mode: 'catchup',
    count: 2,
    catchUpTarget: '3',
    batches: { catchup: matchLineupFixtures.autoQueueCopyStates.targetMet },
  },
}
export const CatchUpShortfall: Story = {
  args: {
    mode: 'catchup',
    count: 2,
    catchUpTarget: '5',
    batches: { catchup: matchLineupFixtures.autoQueueCopyStates.shortfall },
  },
}

export const NoEligiblePlayersAfterGeneration: Story = {
  args: {
    count: 2,
    hasEligiblePlayers: false,
    batches: { available: matchLineupFixtures.autoQueueCopyStates.shortBatch },
  },
}

/** Doubles session: the header switch, off. The list is kept but Generate ignores it. */
export const BaggingOff: Story = { args: { count: 2, bagging: baggingArgs(false) } }
/** Switch on with no pairs yet. */
export const BaggingOnEmpty: Story = { args: { count: 2, bagging: baggingArgs(true, []) } }
/** Switch on with pairs; the first draft carries the bagging reason line. */
export const BaggingOnWithPairs: Story = {
  args: {
    count: 2,
    bagging: baggingArgs(true),
    batches: {
      ...fixture,
      available: {
        ...fixture.available,
        drafts: fixture.available.drafts.map((draft, i) =>
          i === 0
            ? {
                ...draft,
                reason: `Bagging pair: ${baggingFixture.pairs[0]?.a.shortName} and ${baggingFixture.pairs[0]?.b.shortName} are partners`,
              }
            : draft,
        ),
      },
    },
  },
}
/** No doubles in the session: no switch and no card (the `bagging` prop is left out). */
export const BaggingHidden: Story = { args: { count: 2, batches: {} } }
export const BaggingPhone: Story = {
  args: { count: 2, bagging: baggingArgs(true) },
  globals: { viewport: { value: 'phone' } },
}
/** Turn the switch on, open Add pair, pick two players and add them. */
export const BaggingAddPair: Story = {
  args: { count: 2, batches: {}, bagging: baggingArgs(false, []) },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('switch', { name: 'Bagging mode' }))
    await expect(
      canvas.getByText('No pairs yet. Add a pair to keep two players as partners.'),
    ).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Add pair' }))
    const sheet = within(document.body)
    const [first, second] = baggingFixture.players
    await userEvent.click(sheet.getByRole('button', { name: new RegExp(`^${first!.name},`) }))
    await userEvent.click(sheet.getByRole('button', { name: new RegExp(`^${second!.name},`) }))
    await userEvent.click(sheet.getByRole('button', { name: 'Add pair' }))
    await expect(canvas.getByRole('heading', { name: 'Bagging pairs · 1' })).toBeVisible()
  },
}
