import { matchLineupFixtures } from '@rotra/data/fixtures/match-lineups'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
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
    catchUpTarget: '',
    onCatchUpTargetChange: fn(),
    batches: fixture,
    selectedIds: [],
    onSelect: fn(),
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

export const Generated: Story = {}
export const Empty: Story = { args: { batches: {} } }
export const MainQueue: Story = { args: { workspace: 'main' } }
export const CrossTabSelected: Story = {
  args: { selectedIds: ['draft-available-1', 'draft-ahead-1'] },
}
export const Stale: Story = {
  args: { batches: { ...fixture, available: { ...fixture.available, stale: true } } },
}
export const BlockedPlayer: Story = { args: { mode: 'ahead' } }
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
    onAddToMainQueue: async () => false,
  },
}
