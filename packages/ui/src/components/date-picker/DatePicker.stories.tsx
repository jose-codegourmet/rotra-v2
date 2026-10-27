import { Field } from '@rotra/ui/field'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { DatePicker } from './DatePicker'
import { addDays, todayYmd, toYmd } from './date-calendar/DateCalendar.helpers'

const today = todayYmd()
const inDays = (n: number) => toYmd(addDays(new Date(), n))

const meta = {
  title: 'Shared/Fields/DatePicker',
  component: DatePicker,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DatePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState(today)
    return (
      <Field label="Date">
        <DatePicker
          value={value}
          onChange={setValue}
          min={today}
          markedDates={[inDays(2), inDays(9)]}
          markedLabel="your club has a session"
          markedLegend="Your club already has a session"
        />
      </Field>
    )
  },
}

export const Empty: Story = {
  render: () => {
    const [value, setValue] = useState('')
    return (
      <Field label="Date">
        <DatePicker value={value} onChange={setValue} min={today} />
      </Field>
    )
  },
}

export const Invalid: Story = {
  render: () => (
    <Field label="Date" error="Choose a date for the session.">
      <DatePicker value="" />
    </Field>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Field label="Date">
      <DatePicker value={today} disabled />
    </Field>
  ),
}

export const Phone: Story = {
  render: Default.render,
  globals: { viewport: { value: 'phone' } },
}
