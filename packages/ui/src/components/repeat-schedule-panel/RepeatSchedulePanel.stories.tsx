import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import {
  type RepeatOccurrence,
  type RepeatRule,
  RepeatSchedulePanel,
  type RepeatSchedulePanelProps,
} from './RepeatSchedulePanel'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')
const DAY = 864e5
const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

const series = (count: number, stepDays: number, clashAt?: number): RepeatOccurrence[] =>
  Array.from({ length: count }, (_, i) => {
    const startsAt = tonight.scheduledStartAt + (i + 1) * stepDays * DAY
    const endsAt = tonight.scheduledEndAt + (i + 1) * stepDays * DAY
    return i === clashAt
      ? {
          startsAt,
          endsAt,
          clash: {
            sessionId: tonight.id,
            text: `Venue clash: ${tonight.venueName} is already booked for ${tonight.title}, ${time(tonight.scheduledStartAt)}–${time(tonight.scheduledEndAt)}`,
          },
        }
      : { startsAt, endsAt }
  })

function Demo(props: Partial<RepeatSchedulePanelProps>) {
  const [repeat, setRepeat] = useState<RepeatRule>(props.repeat ?? 'weekly')
  const [count, setCount] = useState(props.count ?? 4)
  return (
    <RepeatSchedulePanel
      occurrences={series(count, repeat === 'biweekly' ? 14 : repeat === 'monthly' ? 30 : 7)}
      onViewClash={fn()}
      {...props}
      repeat={repeat}
      onRepeatChange={setRepeat}
      count={count}
      onCountChange={setCount}
    />
  )
}

const meta = {
  title: 'Queue/RepeatSchedulePanel',
  component: RepeatSchedulePanel,
  decorators: [
    (Story) => (
      <div className="max-w-[640px]">
        <Story />
      </div>
    ),
  ],
  args: {
    repeat: 'weekly',
    onRepeatChange: fn(),
    count: 4,
    onCountChange: fn(),
    occurrences: series(4, 7),
    onViewClash: fn(),
  },
} satisfies Meta<typeof RepeatSchedulePanel>

export default meta
type Story = StoryObj<typeof meta>

export const DoesNotRepeat: Story = { render: () => <Demo repeat="none" /> }
export const WeeklyNoClash: Story = { render: () => <Demo /> }
export const MonthlyWithOneClash: Story = {
  args: { repeat: 'monthly', occurrences: series(4, 30, 1) },
}
export const EveryDateClashes: Story = {
  args: {
    repeat: 'weekly',
    count: 2,
    occurrences: [series(1, 7, 0)[0], series(2, 7, 1)[1]].filter((o): o is RepeatOccurrence =>
      Boolean(o),
    ),
    error: 'Every date clashes with another session. Change the start date, time or venue.',
  },
}
export const Phone: Story = {
  args: MonthlyWithOneClash.args,
  globals: { viewport: { value: 'phone' } },
}
