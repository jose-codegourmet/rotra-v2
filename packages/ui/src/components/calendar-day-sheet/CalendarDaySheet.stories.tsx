import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import { Button } from '@rotra/ui/button'
import type { CalendarEvent } from '@rotra/ui/session-calendar/helpers'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { CalendarDaySheet, type CalendarDaySheetProps } from './CalendarDaySheet'

const DAY = 864e5
const today = new Date().setHours(12, 0, 0, 0)
const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')

const events: CalendarEvent[] = [
  {
    sessionId: 'morning',
    title: 'Morning Drills',
    venueName: tonight.venueName,
    startsAt: today - 4 * 3_600_000,
    endsAt: today - 2 * 3_600_000,
    kind: 'completed',
  },
  {
    sessionId: tonight.id,
    title: tonight.title,
    venueName: tonight.venueName,
    startsAt: tonight.scheduledStartAt,
    endsAt: tonight.scheduledEndAt,
    kind: 'live',
  },
]

function Demo(props: Partial<CalendarDaySheetProps>) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open day</Button>
      <CalendarDaySheet
        date={today}
        today={today}
        events={events}
        onOpenSession={fn()}
        onCreateOnDay={fn()}
        {...props}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

const meta = {
  title: 'Queue/CalendarDaySheet',
  component: CalendarDaySheet,
  args: {
    open: true,
    onOpenChange: fn(),
    date: today,
    today,
    events,
    onOpenSession: fn(),
    onCreateOnDay: fn(),
  },
} satisfies Meta<typeof CalendarDaySheet>

export default meta
type Story = StoryObj<typeof meta>

export const TodayWithSessions: Story = { render: () => <Demo /> }
export const FutureEmpty: Story = { render: () => <Demo date={today + 3 * DAY} events={[]} /> }
export const PastEmpty: Story = { render: () => <Demo date={today - 2 * DAY} events={[]} /> }
export const Phone: Story = {
  render: () => <Demo />,
  globals: { viewport: { value: 'phone' } },
}
