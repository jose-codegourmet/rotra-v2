import { startMatchFixtures } from '@rotra/data/fixtures/start-match'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ChooseMatchSheet } from './ChooseMatchSheet'

const { chooseMatch } = startMatchFixtures

const meta = {
  title: 'Queue/ChooseMatchSheet',
  component: ChooseMatchSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    courtLabel: chooseMatch.courtLabel,
    rows: chooseMatch.rows,
    onStartHere: fn(),
  },
} satisfies Meta<typeof ChooseMatchSheet>

export default meta
type Story = StoryObj<typeof meta>

/** #1 is blocked by a player on court, #2 is ready, #3 needs attention (a player is not present). */
export const Mixed: Story = {}

/** Every waiting match can go next. */
export const AllReady: Story = {
  args: {
    rows: chooseMatch.rows.map((row) => ({
      ...row,
      status: { kind: 'ready', reason: 'Ready to start' },
    })),
  },
}

/** Nothing can start here yet. */
export const NoneReady: Story = {
  args: { rows: chooseMatch.rows.filter((row) => row.status.kind !== 'ready') },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
