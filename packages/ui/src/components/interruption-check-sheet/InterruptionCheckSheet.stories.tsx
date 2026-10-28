import {
  missingRecordsFixture,
  longMissingRecordsFixture,
} from '@rotra/data/fixtures/sync-recovery'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { InterruptionCheckSheet } from './InterruptionCheckSheet'
const meta = {
  title: 'Queue/InterruptionCheckSheet',
  component: InterruptionCheckSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    missingSummary: missingRecordsFixture,
    onYes: fn(),
    onNo: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof InterruptionCheckSheet>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const LongSummary: Story = { args: { missingSummary: longMissingRecordsFixture } }
