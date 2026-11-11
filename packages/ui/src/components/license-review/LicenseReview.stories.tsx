import { ADMIN_LICENSE_TODAY } from '@rotra/data/fixtures/admin-clubs'
import { clubs } from '@rotra/data/fixtures/clubs'
import { formatYmd } from '@rotra/ui/license-access-chip/variants'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { LicenseReview, type LicenseReviewProps } from './LicenseReview'

function clubOf(username: string) {
  const club = clubs.find((row) => row.username === username)
  if (!club) throw new Error(`Club fixture missing: ${username}`)
  return club
}

const lahug = clubOf('lahug.smash')
const talamban = clubOf('talamban.racket')
const molo = clubOf('molo.shuttle')
const tagbilaran = clubOf('tagbilaran.circle')

// rotra-admin.html licEffects(): the lines every review ends with.
const STILL_ONE_SESSION = 'Still one active session at a time.'
const ADDS_RECORD = 'Adds a payment record the club sees in Club settings.'
const canUse = (name: string, from: string, to: string) =>
  `${name} can use the Queue app from ${formatYmd(from)} to ${formatYmd(to)}.`

/** A club just added (as in the Add club stories): paid, never licensed, Yearly from today. */
const activate: LicenseReviewProps = {
  verb: 'Activate',
  club: { name: 'Banilad Smash Club', username: 'banilad.smash' },
  plan: 'Yearly',
  startsOn: ADMIN_LICENSE_TODAY,
  endsOn: '2027-10-26',
  payment: { amountMinor: 1500000, paidOn: ADMIN_LICENSE_TODAY },
  planPriceMinor: 1500000,
  reference: 'GCash transfer 8812',
  effects: [
    canUse('Banilad Smash Club', ADMIN_LICENSE_TODAY, '2027-10-26'),
    STILL_ONE_SESSION,
    ADDS_RECORD,
  ],
  onBack: fn(),
  onConfirm: fn(),
}

const meta = {
  title: 'Admin/LicenseReview',
  component: LicenseReview,
  args: activate,
} satisfies Meta<typeof LicenseReview>

export default meta
type Story = StoryObj<typeof meta>

/** A typed note: Reference reads "LIC number assigned when saved", Note shows the text. */
export const Activate: Story = {}
/** Lahug is active until Mar 31, 2027: the renewal starts the day after, Apr 1, 2027. No note. */
export const Renew: Story = {
  args: {
    verb: 'Renew',
    club: { name: lahug.name, username: lahug.username },
    plan: 'Yearly',
    startsOn: '2027-04-01',
    endsOn: '2028-03-31',
    payment: { amountMinor: lahug.licenseYearlyMinor, paidOn: ADMIN_LICENSE_TODAY },
    planPriceMinor: lahug.licenseYearlyMinor,
    reference: '',
    effects: [canUse(lahug.name, '2027-04-01', '2028-03-31'), STILL_ONE_SESSION, ADDS_RECORD],
  },
}
/** Talamban expired on Oct 1 and paid less than its monthly price; renewing restores its pages. */
export const AmountDiffers: Story = {
  args: {
    verb: 'Renew',
    club: { name: talamban.name, username: talamban.username },
    plan: 'Monthly',
    startsOn: ADMIN_LICENSE_TODAY,
    endsOn: '2026-11-26',
    payment: { amountMinor: 120000, paidOn: '2026-10-26' },
    planPriceMinor: talamban.licenseMonthlyMinor,
    reference: 'GCash transfer 8812',
    effects: [
      canUse(talamban.name, ADMIN_LICENSE_TODAY, '2026-11-26'),
      `Restores the club's stale public pages and cancels the deletion scheduled for ${formatYmd('2027-04-01')}.`,
      STILL_ONE_SESSION,
      ADDS_RECORD,
    ],
  },
}
/** Molo's public pages were already deleted: renewing doesn't bring them back. */
export const RenewDeleted: Story = {
  args: {
    verb: 'Renew',
    club: { name: molo.name, username: molo.username },
    plan: 'Monthly',
    startsOn: ADMIN_LICENSE_TODAY,
    endsOn: '2026-11-26',
    payment: { amountMinor: molo.licenseMonthlyMinor, paidOn: ADMIN_LICENSE_TODAY },
    planPriceMinor: molo.licenseMonthlyMinor,
    reference: '',
    effects: [
      canUse(molo.name, ADMIN_LICENSE_TODAY, '2026-11-26'),
      `The public pages deleted on ${formatYmd('2026-10-01')} don't come back. Player match history and ranks were kept.`,
      STILL_ONE_SESSION,
      ADDS_RECORD,
    ],
  },
}
/** The tester club: recorded at ₱0, shown as Free · tester club. */
export const Free: Story = {
  args: {
    club: { name: tagbilaran.name, username: tagbilaran.username },
    plan: 'Monthly',
    startsOn: ADMIN_LICENSE_TODAY,
    endsOn: '2026-11-26',
    payment: null,
    planPriceMinor: 0,
    reference: '',
    effects: [
      canUse(tagbilaran.name, ADMIN_LICENSE_TODAY, '2026-11-26'),
      STILL_ONE_SESSION,
      ADDS_RECORD,
    ],
  },
}
export const Saving: Story = { args: { ...Renew.args, isPending: true } }
/** After Check status found nothing (rotra-admin.html licCheck). */
export const ServerError: Story = {
  args: { ...Renew.args, serverError: "It wasn't saved. You can save it again." },
}
export const Phone: Story = { ...Renew, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { ...Renew, globals: { viewport: { value: 'desktop' } } }
export const ActivateLight: Story = { globals: { theme: 'light' } }
export const RenewLight: Story = { ...Renew, globals: { theme: 'light' } }
export const AmountDiffersLight: Story = { ...AmountDiffers, globals: { theme: 'light' } }
export const FreeLight: Story = { ...Free, globals: { theme: 'light' } }
