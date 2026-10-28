import { clubs } from '@rotra/data/fixtures/clubs'
import { inventoryItems } from '@rotra/data/fixtures/inventory'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import { venues } from '@rotra/data/fixtures/venues'
import { estimateSessionCost } from '@rotra/data/session-cost/rules'
import type { RepeatOccurrence } from '@rotra/ui/repeat-schedule-panel'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SessionSetupForm, type SessionSetupFormProps } from './SessionSetupForm'
import { durationMinutes, playersPerGame, sessionTimes } from './SessionSetupForm.helpers'
import type { SessionSetupInput } from './SessionSetupForm.schema'

const club = clubs[0]
const venue = venues[0]
const tonight = queueSessionFixtures.sessions[0]
if (!club || !venue || !tonight) throw new Error('Fixtures missing')

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

// A story-local copy of the prototype rules, so stories do not import @rotra/data at runtime.
const occurrencesOf =
  (clashWith?: {
    title: string
    venueName: string
    venueId: string
    startsAt: number
    endsAt: number
  }) =>
  (values: SessionSetupInput): RepeatOccurrence[] => {
    const { start, end } = sessionTimes(values)
    const n = values.repeat === 'none' ? 1 : values.repeatCount
    const step = values.repeat === 'biweekly' ? 14 : values.repeat === 'monthly' ? 30 : 7
    return Array.from({ length: n }, (_, i) => {
      const startsAt = start + i * step * 864e5
      const endsAt = end + i * step * 864e5
      const clashes = clashWith && i === 0
      return clashes
        ? {
            startsAt,
            endsAt,
            clash: {
              sessionId: 's-tonight',
              text:
                clashWith.venueId === values.venue.venueId
                  ? `Venue clash: ${clashWith.venueName} is already booked for ${clashWith.title}, ${time(clashWith.startsAt)}–${time(clashWith.endsAt)}`
                  : `Time clash: ${clashWith.title} runs ${time(clashWith.startsAt)}–${time(clashWith.endsAt)} at ${clashWith.venueName}`,
            },
          }
        : { startsAt, endsAt }
    })
  }

const estimate: SessionSetupFormProps['computeEstimate'] = (values, players) => {
  const n = Math.max(1, players)
  const per = playersPerGame(values)
  const usable = Math.max(1, Math.min(values.courtLabels.length, Math.floor(n / per)))
  const minutes = durationMinutes(values)
  const at = (len: number) => Math.floor((usable * Math.floor(minutes / len) * per) / n)
  return { low: at(20), high: at(15), usable }
}

const withVenue: Partial<SessionSetupInput> = {
  title: 'Thursday Open Play',
  venue: { venueId: venue.id, name: venue.name, address: venue.address },
}

const meta = {
  title: 'Queue/SessionSetupForm',
  component: SessionSetupForm,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[860px]">
        <Story />
      </div>
    ),
  ],
  args: {
    mode: 'create',
    clubName: club.name,
    onSubmit: fn(),
    onCancel: fn(),
    onOpenDatePicker: fn(),
    onOpenVenuePicker: fn(),
    onViewClash: fn(),
    getOccurrences: occurrencesOf(),
    computeEstimate: estimate,
  },
} satisfies Meta<typeof SessionSetupForm>

export default meta
type Story = StoryObj<typeof meta>

export const NewSession: Story = {}
/** Press Next with the title and venue empty. */
export const PageOneErrors: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }))
  },
}
export const SingleClash: Story = {
  args: {
    initialValues: withVenue,
    getOccurrences: occurrencesOf({
      title: tonight.title,
      venueName: tonight.venueName,
      venueId: tonight.venueId,
      startsAt: tonight.scheduledStartAt,
      endsAt: tonight.scheduledEndAt,
    }),
  },
}
export const RepeatingWithSkippedDate: Story = {
  args: {
    initialValues: { ...withVenue, repeat: 'weekly', repeatCount: 4 },
    getOccurrences: occurrencesOf({
      title: tonight.title,
      venueName: 'Lahug Covered Court',
      venueId: 'other',
      startsAt: tonight.scheduledStartAt,
      endsAt: tonight.scheduledEndAt,
    }),
  },
}
export const EditBudgetReduction: Story = {
  args: {
    mode: 'edit',
    initialValues: { ...withVenue, courtLabels: ['Court 1'], playersPerCourt: 8 },
    editContext: { rosterCount: 14, waitlistCount: 2 },
  },
}
export const Offline: Story = { args: { initialValues: withVenue, offline: true } }
export const Pending: Story = { args: { initialValues: withVenue, isPending: true } }
export const Phone: Story = {
  args: { initialValues: withVenue },
  globals: { viewport: { value: 'phone' } },
}
export const BothFormatsOff: Story = {
  args: { initialValues: { ...withVenue, allowSingles: false, allowDoubles: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Step 2/ }))
  },
}
export const SetByYou: Story = {
  args: { initialValues: { ...withVenue, minimumIsCalculated: false, minimumGames: '5' } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Step 2/ }))
  },
}
export const ReviewRepeating: Story = {
  args: RepeatingWithSkippedDate.args,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Step 3/ }))
  },
}
export const ReviewEdit: Story = {
  args: EditBudgetReduction.args,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Step 3/ }))
  },
}

export const FinancialsValidation: Story = {
  args: {
    initialPage: 2,
    initialValues: {
      ...withVenue,
      courtFeePerCourtHour: '-1',
      paymentMode: 'custom',
      customFeePerHead: '',
    },
    financials: {
      shuttleItems: inventoryItems.filter((i) => i.category === 'shuttlecocks'),
      venueRates: [],
      computeEstimate: estimateSessionCost,
      onManageInventory: fn(),
    },
  },
  play: async ({ canvasElement }) => {
    canvasElement.querySelector('form')?.requestSubmit()
  },
}
export const FinancialsOffline: Story = {
  args: {
    ...FinancialsValidation.args,
    initialValues: { ...withVenue, courtFeePerCourtHour: '350' },
    offline: true,
  },
}
