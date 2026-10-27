import type { Meta, StoryObj } from '@storybook/react-vite'
import { SyncDetails } from './SyncDetails'

// Changes and copy as the Queue prototype's Sync status sheet shows them.
const SYNCED = [
  {
    area: 'Matches and results',
    changes: [
      { id: 'c1', text: 'Match 3 started on Court 2', at: '7:38 PM' },
      { id: 'c2', text: 'Match 1 result confirmed', at: '7:31 PM' },
    ],
  },
  { area: 'Roster', changes: [{ id: 'c3', text: 'Kat Lim marked present', at: '7:05 PM' }] },
]

const meta = {
  title: 'Shared/SyncDetails',
  component: SyncDetails,
  decorators: [
    (Story) => (
      <div className="flex max-w-[560px] flex-col gap-3.5 rounded-2xl border border-border-strong bg-surface p-5">
        <Story />
      </div>
    ),
  ],
  args: {
    state: 'synced',
    lastSyncedAt: '7:42 PM',
    description: 'Everything on this device synced. Last sync 7:42 PM.',
    waiting: [],
    synced: SYNCED,
  },
} satisfies Meta<typeof SyncDetails>

export default meta
type Story = StoryObj<typeof meta>

export const Synced: Story = {}

export const OfflineWaiting: Story = {
  args: {
    state: 'offline',
    pending: 2,
    description:
      '2 changes saved on this device, waiting for internet. They sync automatically when you reconnect.',
    waiting: [
      {
        area: 'Queue',
        changes: [
          { id: 'w1', text: 'Match 5 added', at: '7:50 PM' },
          { id: 'w2', text: 'Match 4 moved up', at: '7:49 PM' },
        ],
      },
    ],
  },
}

export const NothingSyncedYet: Story = {
  args: {
    synced: [],
    description: 'Nothing is waiting. New changes save on this device until you reconnect.',
    state: 'offline',
  },
}
