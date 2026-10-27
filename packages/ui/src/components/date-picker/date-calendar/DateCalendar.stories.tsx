import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { DateCalendar } from './DateCalendar'
import { addDays, todayYmd, toYmd } from './DateCalendar.helpers'

const today = todayYmd()

const meta = {
  title: 'Shared/Fields/DateCalendar',
  component: DateCalendar,
  decorators: [
    (Story) => (
      <div className="max-w-[340px] rounded-2xl border border-border-strong bg-surface p-4">
        <Story />
      </div>
    ),
  ],
  args: { value: today, onChange: () => {}, min: today },
} satisfies Meta<typeof DateCalendar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <DateCalendar
        {...args}
        value={value}
        onChange={setValue}
        markedDates={[toYmd(addDays(new Date(), 3))]}
        markedLabel="your club has a session"
      />
    )
  },
}

export const NoMinimum: Story = { args: { min: undefined } }
