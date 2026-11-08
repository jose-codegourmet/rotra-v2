import { courtPreviewFixture } from '@rotra/data/fixtures/consoleSessions'
import { Button } from '@rotra/ui/button'
import { Field } from '@rotra/ui/field'
import { Sheet } from '@rotra/ui/sheet'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { DateTimePicker } from './DateTimePicker'
import { startOfDay } from './DateTimePicker.helpers'

const { scheduledStart, sessionEnd, laterSessionEnd, overnightStart, overnightEnd } =
  courtPreviewFixture
const sessionDay = startOfDay(scheduledStart)
const nextDay = startOfDay(overnightEnd)
const offGrid = new Date(scheduledStart).setHours(22, 42, 0, 0)
const nothingValidMin = new Date(scheduledStart).setHours(23, 50, 0, 0)
const nothingValidMax = new Date(scheduledStart).setHours(23, 55, 0, 0)

/** Opens the time dialog (the time field button), so the story shows it. */
const openTimeDialog: Story['play'] = async ({ canvasElement }) => {
  canvasElement.querySelector<HTMLButtonElement>('button[aria-label$="Change time"]')?.click()
}

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
      <Field label={args.label} hint="Two days: day buttons above the time field">
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
      <Field label={args.label} hint="10:42 PM is off the 15-minute grid: minute 42 stays offered">
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
      <Field label={args.label} hint="Empty follows session end. Set time starts from it">
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

/** Court planned start and open until side by side: each picker fits a half-width column at 375 px. */
export const PhoneHalfWidth: Story = {
  args: OffGridValue.args,
  globals: { viewport: { value: 'phone' } },
  render: (args) => {
    const [start, setStart] = useState(args.value)
    const [end, setEnd] = useState<number | null>(null)
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label="Planned start">
          <DateTimePicker {...args} value={start} onChange={setStart} />
        </Field>
        <Field label="Open until">
          <DateTimePicker
            {...args}
            label="Open until"
            value={end}
            onChange={setEnd}
            min={(start ?? scheduledStart) + 60_000}
            max={laterSessionEnd}
            fallback={laterSessionEnd}
            emptyLabel="Session end"
          />
        </Field>
      </div>
    )
  },
}

/** The time dialog of a one-day field: AM | PM, 12 hours, :00 :15 :30 :45 and Done. */
export const DialogOpen: Story = { render: OneDay.render, play: openTimeDialog }
export const DialogOpenLight: Story = {
  render: OneDay.render,
  play: openTimeDialog,
  globals: { theme: 'light' },
}
export const DialogOpenPhone: Story = {
  render: OneDay.render,
  play: openTimeDialog,
  globals: { viewport: { value: 'phone' } },
}

/** Off-grid value in the dialog: :42 is a fifth minute button while it is the value. */
export const OffGridDialog: Story = {
  args: OffGridValue.args,
  render: OffGridValue.render,
  play: openTimeDialog,
}

/** Empty option on, in light: the time field is hidden until Set time. */
export const EmptyOptionLight: Story = {
  args: EmptyOption.args,
  render: EmptyOption.render,
  globals: { theme: 'light' },
}

export const NothingValidLight: Story = {
  args: NothingValid.args,
  render: NothingValid.render,
  globals: { theme: 'light' },
}

const endsArgs = {
  label: 'Ends',
  value: overnightEnd,
  days: [sessionDay, nextDay],
  base: sessionDay,
  min: overnightStart + 1,
  max: overnightStart + 86_400_000,
  nextDaySwitch: true,
}

/**
 * Ends on the next day: no day buttons; the field shows "next day" under the time and the dialog
 * ends with the "Ends the next day" switch (on).
 */
export const NextDaySwitch: Story = {
  args: endsArgs,
  render: (args) => {
    const [value, setValue] = useState(args.value)
    const later = value != null && startOfDay(value) !== sessionDay
    return (
      <Field label={args.label}>
        <DateTimePicker
          {...args}
          value={value}
          onChange={setValue}
          suffix={later ? 'next day' : undefined}
        />
      </Field>
    )
  },
}
export const NextDaySwitchDialog: Story = {
  args: endsArgs,
  render: NextDaySwitch.render,
  play: openTimeDialog,
}
export const NextDaySwitchDialogLight: Story = {
  args: endsArgs,
  render: NextDaySwitch.render,
  play: openTimeDialog,
  globals: { theme: 'light' },
}

/** Same-day end: the switch is off; 11:00 PM is past 24 hours on the next day, so turning it on takes 12:00 AM. */
export const NextDaySwitchOff: Story = {
  args: { ...endsArgs, value: new Date(overnightStart).setHours(23, 0, 0, 0) },
  render: NextDaySwitch.render,
  play: openTimeDialog,
}

/**
 * Opened from inside another dialog (Edit Court N): the time dialog stacks on top; Done, ×, Escape
 * or the backdrop close only it and return focus to the time field in the court dialog.
 */
export const InsideDialog: Story = {
  args: { ...OffGridValue.args, label: 'Planned start' },
  render: (args) => {
    const [open, setOpen] = useState(true)
    const [start, setStart] = useState(args.value)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Edit Court 2</Button>
        <Sheet
          open={open}
          onOpenChange={setOpen}
          title="Edit Court 2"
          footer={
            <Button variant="primary" onClick={() => setOpen(false)}>
              Done
            </Button>
          }
        >
          <Field label={args.label}>
            <DateTimePicker {...args} value={start} onChange={setStart} />
          </Field>
        </Sheet>
      </>
    )
  },
}
export const InsideDialogOpen: Story = {
  args: InsideDialog.args,
  render: InsideDialog.render,
  play: async () => {
    document
      .querySelector<HTMLButtonElement>('[role="dialog"] button[aria-label$="Change time"]')
      ?.click()
  },
}
export const InsideDialogLight: Story = {
  args: InsideDialog.args,
  render: InsideDialog.render,
  globals: { theme: 'light' },
}
