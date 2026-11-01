import { matchLineupFixtures } from '@rotra/data/fixtures/match-lineups'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn } from 'storybook/test'
import {
  type AutoQueueCount,
  type AutoQueueMode,
  AutoQueueWorkspace,
  type AutoQueueWorkspaceProps,
  type QueueWorkspace,
} from './AutoQueueWorkspace'

const fixture = matchLineupFixtures.autoQueueWorkspace

function Demo(args: AutoQueueWorkspaceProps) {
  const [workspace, setWorkspace] = useState<QueueWorkspace>(args.workspace)
  const [mode, setMode] = useState<AutoQueueMode>(args.mode)
  const [count, setCount] = useState<AutoQueueCount | null>(args.count)
  const [target, setTarget] = useState(args.catchUpTarget)
  const [batches, setBatches] = useState(args.batches)
  const [selected, setSelected] = useState(args.selectedIds)
  return (
    <AutoQueueWorkspace
      {...args}
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
