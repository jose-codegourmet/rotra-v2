import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CourtsAndTimeSheet } from './CourtsAndTimeSheet'

// The live console fixture: three courts, started an hour ago, ends in two hours.
const { session, courts } = consoleSessionFixture

const meta = {
  title: 'Queue/CourtsAndTimeSheet',
  component: CourtsAndTimeSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    courts,
    endsAt: session.scheduledEndAt,
    onAddCourt: fn(),
    onExtend: fn(),
  },
} satisfies Meta<typeof CourtsAndTimeSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** An extension is running: both Extend buttons are disabled. */
export const Extending: Story = { args: { isPending: true } }

/** After "Extend 60 min": the end time moved. */
export const Extended: Story = { args: { endsAt: session.scheduledEndAt + 3600000 } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
