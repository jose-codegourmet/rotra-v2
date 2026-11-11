import { longSyncConflictFixture, syncConflictsFixture } from '@rotra/data/fixtures/sync-recovery'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ConflictReviewList } from './ConflictReviewList'

const meta = {
  title: 'Queue/ConflictReviewList',
  component: ConflictReviewList,
  args: { conflicts: syncConflictsFixture, onSelectPlayer: fn() },
} satisfies Meta<typeof ConflictReviewList>
export default meta
type Story = StoryObj<typeof meta>
export const TwoConflicts: Story = {}
export const OneConflictLongNames: Story = { args: { conflicts: [longSyncConflictFixture] } }
/** Real mode (#722): a change this device saved offline that the server refused on replay. */
export const RefusedDeviceChange: Story = {
  args: {
    conflicts: [
      {
        id: 'op-1',
        matchNumber: 0,
        courtLabel: '',
        versions: [],
        pending: {
          text: 'Team A wins match 5 · Court 2 free',
          area: 'Matches and results',
          recordedAt: Date.now() - 20 * 60_000,
          message: 'This match already has a confirmed outcome or is not active.',
        },
      },
    ],
    onKeepServer: fn(),
    onRetry: fn(),
  },
}
