import {
  ADMIN_LICENSE_TODAY,
  adminClubLicenseStates,
  adminClubRows,
  clubAccessExamples,
} from '@rotra/data/fixtures/admin-clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { LicenseStatusCard } from './LicenseStatusCard'

function stateOf(username: string) {
  const id = adminClubRows.find((row) => row.username === username)?.id
  const state = adminClubLicenseStates.find((row) => row.id === id)
  if (!state) throw new Error(`License state fixture missing: ${username}`)
  return { access: state.access, hasTerms: state.hasTerms }
}

const lahug = stateOf('lahug.smash')
const talamban = stateOf('talamban.racket')
const tagbilaran = stateOf('tagbilaran.circle')

const meta = {
  title: 'Admin/LicenseStatusCard',
  component: LicenseStatusCard,
  args: { ...lahug, today: ADMIN_LICENSE_TODAY, onOpenLicense: fn() },
} satisfies Meta<typeof LicenseStatusCard>

export default meta
type Story = StoryObj<typeof meta>

export const Active: Story = {}
export const Expired: Story = { args: talamban }
export const ExpiredNextTerm: Story = {
  args: { ...talamban, access: { ...clubAccessExamples.expired, next: '2026-11-15' } },
}
export const Scheduled: Story = {
  args: { access: clubAccessExamples.scheduled, hasTerms: true },
}
export const Never: Story = { args: tagbilaran }
export const ReadOnly: Story = { args: { onOpenLicense: undefined } }
export const Phone: Story = { args: talamban, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const ActiveLight: Story = { globals: { theme: 'light' } }
export const ExpiredLight: Story = { ...Expired, globals: { theme: 'light' } }
export const ScheduledLight: Story = { ...Scheduled, globals: { theme: 'light' } }
export const NeverLight: Story = { ...Never, globals: { theme: 'light' } }
