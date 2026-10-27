import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { SessionCalendar, type SessionCalendarProps } from './SessionCalendar'
import type { CalendarEvent, CalendarView } from './SessionCalendar.helpers'

const DAY = 864e5
const today = new Date().setHours(12, 0, 0, 0)

// The seeded sessions: tonight (prepared), two completed, one invalid; the first becomes live here.
const toEvent = (
  s: (typeof queueSessionFixtures.sessions)[number],
  kind: CalendarEvent['kind'],
): CalendarEvent => ({
  sessionId: s.id,
  title: s.title,
  venueName: s.venueName,
  startsAt: s.scheduledStartAt,
  endsAt: s.scheduledEndAt,
  kind,
})
const [tonight, h1, h2, h3] = queueSessionFixtures.sessions
if (!tonight || !h1 || !h2 || !h3) throw new Error('Session fixtures missing')

const events: CalendarEvent[] = [
  toEvent(tonight, 'live'),
  {
    ...toEvent(tonight, 'prepared'),
    sessionId: 'next-week',
    startsAt: tonight.scheduledStartAt + 7 * DAY,
    endsAt: tonight.scheduledEndAt + 7 * DAY,
  },
  toEvent(h1, 'completed'),
  toEvent(h2, 'completed'),
  toEvent(h3, 'invalid'),
]

const manyToday: CalendarEvent[] = [
  ...events,
  {
    ...toEvent(tonight, 'prepared'),
    sessionId: 'noon',
    title: 'Lunch Ladder',
    startsAt: today,
    endsAt: today + 2 * 3_600_000,
  },
  {
    ...toEvent(tonight, 'prepared'),
    sessionId: 'morning',
    title: 'Morning Drills',
    startsAt: today - 4 * 3_600_000,
    endsAt: today - 2 * 3_600_000,
  },
]

function Demo(props: Partial<SessionCalendarProps> & { view?: CalendarView }) {
  const [reference, setReference] = useState(props.referenceDate ?? today)
  const [selected, setSelected] = useState<number | undefined>()
  const view = props.view
  const move = (direction: -1 | 1) => {
    const r = new Date(reference)
    setReference(
      view === 'month'
        ? new Date(r.getFullYear(), r.getMonth() + direction, 1).getTime()
        : new Date(
            r.getFullYear(),
            r.getMonth(),
            r.getDate() + direction * (view === 'week' ? 7 : 1),
          ).getTime(),
    )
  }
  return (
    <SessionCalendar
      events={events}
      today={today}
      onOpenSession={fn()}
      onCreateOnDay={fn()}
      {...props}
      referenceDate={reference}
      selectedDate={selected}
      onMove={move}
      onToday={() => setReference(today)}
      onOpenDay={(date) => {
        setSelected(date)
        if (view === 'day') setReference(date)
      }}
    />
  )
}

const meta = {
  title: 'Queue/SessionCalendar',
  component: SessionCalendar,
  parameters: { layout: 'padded' },
  args: {
    events,
    referenceDate: today,
    today,
    onMove: fn(),
    onToday: fn(),
    onOpenDay: fn(),
    onOpenSession: fn(),
    onCreateOnDay: fn(),
  },
} satisfies Meta<typeof SessionCalendar>

export default meta
type Story = StoryObj<typeof meta>

export const Month: Story = {
  render: () => <Demo view="month" />,
  globals: { viewport: { value: 'desktop' } },
}
export const MonthWithMore: Story = {
  render: () => <Demo view="month" events={manyToday} />,
  globals: { viewport: { value: 'desktop' } },
}
export const Week: Story = { render: () => <Demo view="week" /> }
export const Day: Story = {
  render: () => <Demo view="day" events={manyToday} />,
  globals: { viewport: { value: 'phone' } },
}
export const DayEmptyFuture: Story = {
  render: () => <Demo view="day" referenceDate={today + 3 * DAY} />,
  globals: { viewport: { value: 'phone' } },
}
export const DayEmptyPast: Story = {
  render: () => <Demo view="day" referenceDate={today - 2 * DAY} />,
  globals: { viewport: { value: 'phone' } },
}
/** No `view`: follows the viewport (month over 1024 px, week to 641 px, day on phones). */
export const Responsive: Story = { render: () => <Demo /> }
