import { consoleSessionFixture, courtPreviewFixture } from '@rotra/data/fixtures/consoleSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { AddCourtForm } from './AddCourtForm'
import { nextCourtLabel, toTimeInput } from './AddCourtForm.defaultValues'

// The live console fixture: three courts, started an hour ago, ends in two hours. "now" is the
// fixture's seed time so every story validates the same way.
const { session, courts } = consoleSessionFixture
const startedAt = session.startedAt
if (startedAt === null) throw new Error('Live session fixture missing')
const NOW = startedAt + 3600000
const MINUTE = 60000

const meta = {
  title: 'Queue/AddCourtForm',
  component: AddCourtForm,
  args: {
    open: true,
    onOpenChange: fn(),
    defaultLabel: nextCourtLabel(courts.length),
    sessionStartsAt: startedAt,
    sessionEndsAt: session.scheduledEndAt,
    now: NOW,
    onSubmit: fn(),
  },
} satisfies Meta<typeof AddCourtForm>

export default meta
type Story = StoryObj<typeof meta>

// The sheet is portaled to <body>, outside the story root.
const submit: Story['play'] = async ({ canvasElement, userEvent }) => {
  const body = within(canvasElement.ownerDocument.body)
  await userEvent.click(await body.findByRole('button', { name: /^Add / }))
}

/** Until the session ends: the preview shows the session end. */
export const UntilSessionEnds: Story = {}

/** A set time an hour from now, inside the session. */
export const SetTimeValid: Story = {
  args: { defaultValues: { mode: 'time', time: toTimeInput(NOW + 60 * MINUTE) } },
}

/** Submitting a set time with the time cleared: "Choose a closing time." */
export const NoClosingTime: Story = {
  args: { defaultValues: { mode: 'time', time: '' } },
  play: submit,
}

/** An already-ended booking is advisory and can be edited. */
export const AdvisoryPastEnd: Story = {
  args: { defaultValues: { mode: 'time', time: toTimeInput(NOW - 30 * MINUTE) } },
  play: submit,
}

/** Invalid immediately, before submit, with the same message as submit. */
export const TimeAfterSessionEnd: Story = {
  args: {
    defaultValues: { mode: 'time', time: toTimeInput(session.scheduledEndAt + 60 * MINUTE) },
  },
}

export const Pending: Story = { args: { isPending: true } }

export const ServerError: Story = {
  args: { serverError: 'Enter a court label and a booking end within the session.' },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }

export const EditingUsedCourt: Story = {
  args: {
    editing: true,
    lockedStartsAt: startedAt,
    defaultValues: { startTime: toTimeInput(startedAt) },
  },
}
export const FutureOpening: Story = {
  args: { defaultValues: { startTime: toTimeInput(NOW + 30 * MINUTE) } },
}

export const FutureTimedBooking: Story = {
  args: {
    now: courtPreviewFixture.now,
    sessionStartsAt: courtPreviewFixture.scheduledStart,
    sessionEndsAt: courtPreviewFixture.laterSessionEnd,
    defaultValues: {
      mode: 'time',
      startTime: courtPreviewFixture.startTime,
      time: courtPreviewFixture.time,
    },
  },
}
export const ReportedInvalidWindow: Story = {
  args: {
    ...FutureTimedBooking.args,
    sessionStartsAt: courtPreviewFixture.actualStart,
    sessionEndsAt: courtPreviewFixture.sessionEnd,
  },
}
export const EndBeforeStart: Story = {
  args: {
    ...FutureTimedBooking.args,
    defaultValues: {
      mode: 'time',
      startTime: courtPreviewFixture.time,
      time: courtPreviewFixture.startTime,
    },
  },
}
export const EarlyStartedSession: Story = {
  args: {
    now: courtPreviewFixture.now,
    sessionStartsAt: courtPreviewFixture.actualStart,
    sessionEndsAt: courtPreviewFixture.sessionEnd,
  },
}
export const OvernightBooking: Story = {
  args: {
    now: courtPreviewFixture.overnightStart,
    sessionStartsAt: courtPreviewFixture.overnightStart,
    sessionEndsAt: courtPreviewFixture.overnightEnd,
    defaultValues: { mode: 'time', startTime: '23:30', time: '00:30' },
  },
}
