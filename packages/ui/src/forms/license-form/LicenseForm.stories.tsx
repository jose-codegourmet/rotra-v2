import {
  ADMIN_LICENSE_TODAY,
  adminClubLicenseStates,
  adminClubRows,
} from '@rotra/data/fixtures/admin-clubs'
import { clubs } from '@rotra/data/fixtures/clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { LicenseForm, type LicenseFormProps } from './LicenseForm'
import { licenseStatusLine } from './LicenseForm.helpers'
import type { LicensePlan } from './LicenseForm.schema'

/** rotra-admin.html termEnd(): one month or twelve on, less a day (stories only; A02.8 owns the rule). */
function termEnd(from: string, plan: LicensePlan) {
  const [y = 0, m = 1, d = 1] = from.split('-').map(Number)
  const months = plan === 'Yearly' ? 12 : 1
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate()
  const end = new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay) - 1))
  return end.toISOString().slice(0, 10)
}

function clubProps(username: string) {
  const club = clubs.find((row) => row.username === username)
  const row = adminClubRows.find((r) => r.username === username)
  const state = adminClubLicenseStates.find((s) => s.id === club?.id)
  if (!club || !row || !state) throw new Error(`License fixtures missing: ${username}`)
  return {
    club: { name: row.name, initials: row.initials, logoUrl: row.logoUrl, accent: row.accent },
    statusLine: licenseStatusLine(state.access),
    isActive: state.access.state === 'active',
    prices: {
      monthlyMinor: club.licenseMonthlyMinor,
      yearlyMinor: club.licenseYearlyMinor,
      isFree: club.licensePricing === 'free',
    },
  } satisfies Partial<LicenseFormProps>
}

/** A club just added (as in the Add club stories): paid, never licensed. */
const newClub = {
  club: { name: 'Banilad Smash Club', initials: 'BS' },
  statusLine: 'Never licensed',
  prices: { monthlyMinor: 150000, yearlyMinor: 1500000, isFree: false },
  defaultValues: { startsOn: ADMIN_LICENSE_TODAY, paidOn: ADMIN_LICENSE_TODAY },
} satisfies Partial<LicenseFormProps>

const meta = {
  title: 'Admin/LicenseForm',
  component: LicenseForm,
  args: {
    ...newClub,
    getTermEnd: termEnd,
    today: ADMIN_LICENSE_TODAY,
    onSubmit: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof LicenseForm>

export default meta
type Story = StoryObj<typeof meta>

const review: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole('button', { name: 'Review' }))
}

export const ActivatePaid: Story = {}
/** Lahug is active until Mar 31, 2027: the start is suggested as the next day. */
export const RenewActive: Story = {
  args: {
    ...clubProps('lahug.smash'),
    defaultValues: {
      plan: 'Yearly',
      startsOn: '2027-04-01',
      paidOn: ADMIN_LICENSE_TODAY,
      amount: '15000',
    },
  },
}
/** Talamban expired on Oct 1; the term starts today. */
export const RenewExpired: Story = {
  args: {
    ...clubProps('talamban.racket'),
    defaultValues: {
      plan: 'Monthly',
      startsOn: ADMIN_LICENSE_TODAY,
      paidOn: ADMIN_LICENSE_TODAY,
      amount: '1500',
      reference: 'LIC-0022',
    },
  },
}
/** The tester club: Amount: Free, and no date paid or amount fields. */
export const Free: Story = {
  args: {
    ...clubProps('tagbilaran.circle'),
    defaultValues: { startsOn: ADMIN_LICENSE_TODAY },
  },
}
/** Review with nothing chosen: plan, start, date paid and amount messages. */
export const Errors: Story = {
  args: { defaultValues: { startsOn: '', paidOn: '' } },
  play: review,
}
/** A payment date after today, an amount with centavos and a reference over 40 characters. */
export const InvalidValues: Story = {
  args: {
    defaultValues: {
      ...newClub.defaultValues,
      plan: 'Monthly',
      paidOn: '2026-10-30',
      amount: '1500.50',
      reference: 'BDO transfer 2026-10-27 from club treasurer account',
    },
  },
  play: review,
}
export const FreeErrors: Story = { ...Free, play: review, args: { ...Free.args, defaultValues: {} } }
export const Pending: Story = { args: { ...RenewActive.args, isPending: true } }
export const ServerError: Story = {
  args: {
    ...RenewActive.args,
    serverError: "You're offline, so nothing was saved. Try again once you're connected.",
  },
}
export const Phone: Story = { ...RenewActive, globals: { viewport: { value: 'phone' } } }
export const PhoneErrors: Story = { ...Errors, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { ...RenewActive, globals: { viewport: { value: 'desktop' } } }
export const ActivatePaidLight: Story = { globals: { theme: 'light' } }
export const RenewActiveLight: Story = { ...RenewActive, globals: { theme: 'light' } }
export const FreeLight: Story = { ...Free, globals: { theme: 'light' } }
export const ErrorsLight: Story = { ...Errors, globals: { theme: 'light' } }
