import { adminAccount } from '@rotra/data/fixtures/admin-accounts'
import { adminAuditEvents } from '@rotra/data/fixtures/admin-audit-events'
import { adminClubRows } from '@rotra/data/fixtures/admin-clubs'
import { rankingSettings } from '@rotra/data/fixtures/ranking-settings'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ActivityLog } from './ActivityLog'

const itPark = adminClubRows.find((row) => row.username === 'itpark.badminton')
if (!itPark) throw new Error('Club fixture missing')
const clubEntries = adminAuditEvents.filter((event) => event.targetId === itPark.id)

// rotra-admin.html S.config seed: Version 1 by the owner on Jan 5, 2026, 9:00 AM.
const versionEntries = [
  {
    id: 'version-1',
    lead: 'Version 1',
    text: `${rankingSettings.assessmentWeightPercent}% / ${100 - rankingSettings.assessmentWeightPercent}% · ${rankingSettings.matchRequirement} matches`,
    at: '2026-01-05T09:00:00+08:00',
    actor: adminAccount.email,
  },
]

const meta = {
  title: 'Admin/ActivityLog',
  component: ActivityLog,
  args: { entries: clubEntries, emptyText: 'No Admin actions recorded for this club yet.' },
} satisfies Meta<typeof ActivityLog>

export default meta
type Story = StoryObj<typeof meta>

export const Club: Story = {}
export const AllClubs: Story = { args: { entries: adminAuditEvents } }
export const Empty: Story = { args: { entries: [] } }
export const EmptyPlayer: Story = {
  args: { entries: [], emptyText: 'No Admin actions recorded for this player.' },
}
export const WithLead: Story = { args: { entries: versionEntries } }
export const Phone: Story = {
  args: { entries: adminAuditEvents },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = {
  args: { entries: adminAuditEvents },
  globals: { viewport: { value: 'desktop' } },
}
export const ClubLight: Story = { globals: { theme: 'light' } }
export const EmptyLight: Story = { args: { entries: [] }, globals: { theme: 'light' } }
