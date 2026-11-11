import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { ClubCalendar, type ClubCalendarSession } from './ClubCalendar'

const DAY = 864e5
const today = new Date().setHours(12, 0, 0, 0)
const at = (days: number, hour: number) => new Date(today + days * DAY).setHours(hour, 0, 0, 0)
const session = (
  id: string,
  title: string,
  days: number,
  status: ClubCalendarSession['status'],
  href: string | null = '#',
): ClubCalendarSession => ({
  id,
  title,
  startsAt: at(days, 19),
  endsAt: at(days, 22),
  status,
  href,
})
const sessions: ClubCalendarSession[] = [
  session('live', 'Sunday Night Queue', 0, 'live'),
  session('thu', 'Thursday Open Play', 3, 'scheduled'),
  session('fri', 'Friday Night Smash', 5, 'scheduled'),
  session('d1', 'Wednesday Doubles', -4, 'done'),
  session('d2', 'Saturday Ladder', -11, 'done'),
  session('d3', 'Early Birds', -11, 'done'),
  session('d4', 'Late Rally', -11, 'done'),
  session('old', 'Summer Social', -120, 'done', null),
]

function Live({ start = null }: { start?: number | null }) {
  const [ref, setRef] = useState(today)
  const [selected, setSelected] = useState<number | null>(start)
  const month = (at: number) => new Date(at).getFullYear() * 12 + new Date(at).getMonth()
  const min = Math.min(...sessions.map((s) => month(s.startsAt)))
  const max = Math.max(...sessions.filter((s) => s.status !== 'done').map((s) => month(s.startsAt)))
  return (
    <ClubCalendar
      sessions={sessions}
      referenceDate={ref}
      today={today}
      selectedDate={selected}
      canMovePrevious={month(ref) > min}
      canMoveNext={month(ref) < Math.max(max, month(today))}
      onMove={(d) => {
        const r = new Date(ref)
        setRef(new Date(r.getFullYear(), r.getMonth() + d, 1).getTime())
      }}
      onToday={() => {
        setRef(today)
        setSelected(new Date(today).setHours(0, 0, 0, 0))
      }}
      onSelectDay={setSelected}
    />
  )
}

const meta = {
  title: 'Player/ClubCalendar',
  component: ClubCalendar,
  args: {
    sessions,
    referenceDate: today,
    today,
    selectedDate: null,
    canMovePrevious: true,
    canMoveNext: true,
    onMove: fn(),
    onToday: fn(),
    onSelectDay: fn(),
  },
} satisfies Meta<typeof ClubCalendar>
export default meta
type Story = StoryObj<typeof meta>
/** Interactive: arrows stop at the oldest and the last upcoming month; tap a date to list it. */
export const Month: Story = { render: () => <Live /> }
export const DaySelected: Story = { render: () => <Live start={today} /> }
export const DoneDay: Story = { args: { selectedDate: at(-11, 12) } }
export const EmptyMonth: Story = {
  args: { referenceDate: today + 60 * DAY, canMoveNext: false },
}
export const PageGone: Story = {
  args: { referenceDate: at(-120, 12), selectedDate: at(-120, 12), canMovePrevious: false },
}
export const Phone: Story = {
  render: () => <Live start={today} />,
  globals: { viewport: { value: 'phone' } },
}
export const MonthLight: Story = { render: () => <Live />, globals: { theme: 'light' } }
export const DaySelectedLight: Story = {
  render: () => <Live start={today} />,
  globals: { theme: 'light' },
}
