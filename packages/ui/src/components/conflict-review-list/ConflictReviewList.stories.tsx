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
