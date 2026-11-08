import { courtPreviewFixture } from '@rotra/data/fixtures/consoleSessions'
import { Field } from '@rotra/ui/field'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { TimeField, type TimeFieldProps } from './TimeField'

const { scheduledStart, sessionEnd, overnightEnd } = courtPreviewFixture
const sevenPm = new Date(scheduledStart).setHours(19, 0, 0, 0)
const offGrid = new Date(scheduledStart).setHours(22, 42, 0, 0)

/** Opens the time dialog, so the story shows it. */
const openDialog: Story['play'] = async ({ canvasElement }) => {
  canvasElement.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')?.click()
}

function Controlled(props: TimeFieldProps) {
  const [value, setValue] = useState(props.value)
  return (
    <Field label={props.label}>
      <TimeField {...props} value={value} onChange={setValue} />
    </Field>
  )
}

const meta = {
  title: 'Shared/Fields/TimeField',
  component: TimeField,
  decorators: [
    (Story) => (
      <div className="max-w-[260px]">
        <Story />
      </div>
    ),
  ],
  args: { label: 'Starts', value: sevenPm },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof TimeField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const DefaultLight: Story = { globals: { theme: 'light' } }

/** The time dialog: large time, AM | PM, 12 hours, four minutes and Done. */
export const DialogOpen: Story = { play: openDialog }
export const DialogOpenLight: Story = { play: openDialog, globals: { theme: 'light' } }
export const DialogOpenPhone: Story = {
  play: openDialog,
  globals: { viewport: { value: 'phone' } },
}
export const DialogOpenPhoneLight: Story = {
  play: openDialog,
  globals: { viewport: { value: 'phone' }, theme: 'light' },
}

/** Only 6:00–9:00 PM is valid: AM and the other hours are disabled; past 9:00 only :00 is offered. */
export const LimitedTimes: Story = {
  args: { label: 'Planned start', value: scheduledStart, min: scheduledStart, max: sessionEnd },
  play: openDialog,
}

/** 10:42 PM is off the 15-minute grid: :42 stays as an extra minute button while it is the value. */
export const OffGridValue: Story = {
  args: { label: 'Planned start', value: offGrid },
  play: openDialog,
}

/** Ends on the next day: muted "next day" line and the "Ends the next day" switch on. */
export const NextDay: Story = {
  args: { label: 'Ends', value: overnightEnd, suffix: 'next day' },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    const [next, setNext] = useState(true)
    return (
      <Field label={args.label}>
        <TimeField
          {...args}
          value={value}
          onChange={setValue}
          suffix={next ? 'next day' : undefined}
          nextDay={{
            checked: next,
            onChange: (checked) => {
              setNext(checked)
              setValue((v) => v + (checked ? 86_400_000 : -86_400_000))
            },
          }}
        />
      </Field>
    )
  },
  play: openDialog,
}

export const Invalid: Story = {
  args: { label: 'Ends', invalid: true },
  render: (args) => (
    <Field label={args.label} error="Choose an end after the start.">
      <TimeField {...args} />
    </Field>
  ),
}

export const Disabled: Story = { args: { disabled: true } }
