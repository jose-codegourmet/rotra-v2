import { courtPreviewFixture } from '@rotra/data/fixtures/consoleSessions'
import { Field } from '@rotra/ui/field'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { DateTimePicker } from './DateTimePicker'
import { startOfDay } from './DateTimePicker.helpers'

const { scheduledStart, sessionEnd, laterSessionEnd, overnightEnd } = courtPreviewFixture
const sessionDay = startOfDay(scheduledStart)
const nextDay = startOfDay(overnightEnd)
const offGrid = new Date(scheduledStart).setHours(22, 42, 0, 0)
const nothingValidMin = new Date(scheduledStart).setHours(23, 50, 0, 0)
const nothingValidMax = new Date(scheduledStart).setHours(23, 55, 0, 0)

const meta = {
  title: 'Queue/DateTimePicker',
  component: DateTimePicker,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  args: {
    label: 'Starts',
    value: scheduledStart,
    days: [sessionDay],
    min: scheduledStart,
    max: sessionEnd,
  },
} satisfies Meta<typeof DateTimePicker>

export default meta
type Story = StoryObj<typeof meta>

export const OneDay: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <Field label={args.label} hint="One day — no day buttons">
        <DateTimePicker {...args} value={value} onChange={setValue} />
      </Field>
    )
  },
}

export const TwoDays: Story = {
  args: {
    label: 'Ends',
    value: overnightEnd,
    days: [sessionDay, nextDay],
    base: sessionDay,
    min: scheduledStart + 1,
    max: scheduledStart + 86_400_000,
  },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <Field label={args.label} hint="Ends the next day">
        <DateTimePicker {...args} value={value} onChange={setValue} />
      </Field>
    )
  },
}

export const OffGridValue: Story = {
  args: {
    label: 'Planned start',
    value: offGrid,
    days: [sessionDay, nextDay],
    base: sessionDay,
    min: scheduledStart,
    max: laterSessionEnd,
    emptyLabel: 'Session start',
  },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <Field label={args.label} hint="10:42 PM is off the 15-minute grid and stays listed">
        <DateTimePicker {...args} value={value} onChange={setValue} />
      </Field>
    )
  },
}

export const EmptyOption: Story = {
  args: {
    label: 'Planned end',
    value: null,
    days: [sessionDay, nextDay],
    base: sessionDay,
    fallback: sessionEnd,
    min: scheduledStart + 1,
    max: sessionEnd,
    emptyLabel: 'Session end',
  },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <Field label={args.label} hint="Empty follows session end">
        <DateTimePicker {...args} value={value} onChange={setValue} />
      </Field>
    )
  },
}

export const NothingValid: Story = {
  args: {
    label: 'New end',
    value: null,
    days: [sessionDay],
    min: nothingValidMin,
    max: nothingValidMax,
  },
  render: (args) => (
    <Field label={args.label}>
      <DateTimePicker {...args} />
    </Field>
  ),
}

export const Invalid: Story = {
  args: {
    label: 'Ends',
    value: scheduledStart,
    days: [sessionDay],
    invalid: true,
  },
  render: (args) => (
    <Field label={args.label} error="Choose an end after the start.">
      <DateTimePicker {...args} />
    </Field>
  ),
}

export const Disabled: Story = {
  args: {
    label: 'Planned start',
    value: scheduledStart,
    days: [sessionDay, nextDay],
    base: sessionDay,
    disabled: true,
  },
  render: (args) => (
    <Field label={args.label} hint="Start is fixed after use.">
      <DateTimePicker {...args} />
    </Field>
  ),
}

export const WithReactHookForm: Story = {
  args: {
    label: 'Ends',
    value: sessionEnd,
    days: [sessionDay, nextDay],
    base: sessionDay,
    min: scheduledStart + 1,
    max: scheduledStart + 86_400_000,
  },
  render: (args) => {
    const { control } = useForm<{ end: number | null }>({
      defaultValues: { end: args.value },
    })
    return (
      <Field label={args.label}>
        <Controller
          name="end"
          control={control}
          render={({ field }) => (
            <DateTimePicker
              {...args}
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      </Field>
    )
  },
}

export const Phone: Story = {
  render: TwoDays.render,
  args: TwoDays.args,
  globals: { viewport: { value: 'phone' } },
}
