import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { StartSessionSheet } from './StartSessionSheet'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const plannedStart = tonight.scheduledStartAt
const plannedEnd = tonight.scheduledEndAt

const meta = {
  title: 'Queue/StartSessionSheet',
  component: StartSessionSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    title: tonight.title,
    courts: 4,
    formatsLabel: 'Doubles',
    modeLabel: 'Fair',
    minimumGames: tonight.minimumGames,
    rosterCount: 17,
    presentCount: 13,
    waitlistCount: 2,
    onConfirm: fn(),
  },
} satisfies Meta<typeof StartSessionSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Online: Story = {}
export const Offline: Story = { args: { offline: true } }
export const Pending: Story = { args: { isPending: true } }
export const Refused: Story = {
  args: { error: 'Thursday Open Play is already running. One session at a time.' },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }

/** On time: the planned window is today and not over, so no New end is asked for. */
export const OnTime: Story = {
  args: { plannedStartAt: plannedStart, plannedEndAt: plannedEnd, now: plannedStart - 10 * MINUTE },
}

/**
 * Late start (T3), planned for yesterday: "This session was planned for … yesterday. Set a new end
 * time to start." and a required New end, pre-filled with now plus the planned length rounded up to
 * 15 minutes.
 */
export const LateStartYesterday: Story = {
  args: {
    plannedStartAt: plannedStart - DAY,
    plannedEndAt: plannedEnd - DAY,
    now: plannedStart + 12 * MINUTE,
  },
}

/** Started after today's planned end: the same notice without a day word. */
export const LateStartAfterPlannedEnd: Story = {
  args: { plannedStartAt: plannedStart, plannedEndAt: plannedEnd, now: plannedEnd + 42 * MINUTE },
}

/** Planned further back: "Sat, Nov 1, 6:00–9:00 PM". */
export const LateStartEarlierDate: Story = {
  args: {
    plannedStartAt: plannedStart - 5 * DAY,
    plannedEndAt: plannedEnd - 5 * DAY,
    now: plannedStart,
  },
}

export const LateStartOffline: Story = { args: { ...LateStartYesterday.args, offline: true } }
export const LateStartPending: Story = { args: { ...LateStartYesterday.args, isPending: true } }
export const LateStartPhone: Story = {
  args: LateStartYesterday.args,
  globals: { viewport: { value: 'phone' } },
}
export const LateStartDesktop: Story = {
  args: LateStartYesterday.args,
  globals: { viewport: { value: 'desktop' } },
}
