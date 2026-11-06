import { consoleSessionFixture, courtWindowFixture } from '@rotra/data/fixtures/consoleSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CourtsAndTimeSheet } from './CourtsAndTimeSheet'

// The live console fixture: three courts, started an hour ago, ends in two hours.
const { session, courts } = consoleSessionFixture
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const started = session.startedAt
// A fixed "now" (the fixture's own) keeps the picker's times and the overdue text stable.
const now = started + HOUR

const meta = {
  title: 'Queue/CourtsAndTimeSheet',
  component: CourtsAndTimeSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    courts,
    startsAt: started,
    endsAt: session.scheduledEndAt,
    now,
    onAddCourt: fn(),
    onExtend: fn(),
    onSetEndTime: fn(),
    onNewEndChange: fn(),
  },
} satisfies Meta<typeof CourtsAndTimeSheet>

export default meta
type Story = StoryObj<typeof meta>

/** New end pre-filled with the current end, Set end time, and Extend 30 / 60 as shortcuts. */
export const Default: Story = {}

/** A change is running: Set end time and both Extend buttons are disabled. */
export const Extending: Story = { args: { isPending: true } }

/** After "Extend 60 min": the end time moved. */
export const Extended: Story = { args: { endsAt: session.scheduledEndAt + HOUR } }

/** Past the planned end: "Ends 9:00 PM · Planned end passed 15 min ago" in warning. */
export const Overdue: Story = { args: { now: session.scheduledEndAt + 15 * MINUTE } }

/** Opened from the overdue banner's Set end time: focus starts on the New end time list. */
export const FocusEnd: Story = {
  args: { now: session.scheduledEndAt + 15 * MINUTE, focusEnd: true },
}

export const ErrorEndBeforeNow: Story = {
  name: 'Error: end before now',
  args: { endTimeError: 'Choose an end time after now.' },
}

export const ErrorCourtOpensLater: Story = {
  name: 'Error: court opens later',
  args: { endTimeError: 'Court 3 opens 9:30 PM. Pick a later end, or edit that court first.' },
}

export const ErrorCourtBookedLater: Story = {
  name: 'Error: court booked later',
  args: {
    endTimeError: 'Court 2 is booked until 10:00 PM. Pick a later end, or edit that court first.',
  },
}

/** Without onSetEndTime only the Extend shortcuts show (containers not yet wired to Set end time). */
export const ExtendOnly: Story = { args: { onSetEndTime: undefined } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const OverduePhone: Story = {
  args: { now: session.scheduledEndAt + 15 * MINUTE },
  globals: { viewport: { value: 'phone' } },
}

export const FiveBookingWindows: Story = {
  args: {
    courts: courtWindowFixture.courts,
    startsAt: courtWindowFixture.session.scheduledStartAt,
    endsAt: courtWindowFixture.session.scheduledEndAt,
    now: courtWindowFixture.session.scheduledStartAt + HOUR,
    onEditCourt: fn(),
    onRemoveCourt: fn(),
  },
}
