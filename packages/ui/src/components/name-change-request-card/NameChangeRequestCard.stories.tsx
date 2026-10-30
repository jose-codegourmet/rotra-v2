import {
  ADMIN_FIXTURE_NOW,
  adminClubOverviews,
  adminClubRows,
} from '@rotra/data/fixtures/admin-clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { NameChangeRequestCard } from './NameChangeRequestCard'

const club = adminClubRows.find((row) => row.nameRequest)
const sentAt = adminClubOverviews.find((row) => row.id === club?.id)?.nameRequestedAt
if (!club?.nameRequest || !sentAt) throw new Error('Name change request fixture missing')

const meta = {
  title: 'Admin/NameChangeRequestCard',
  component: NameChangeRequestCard,
  args: {
    currentName: club.name,
    requestedName: club.nameRequest,
    requestedAt: sentAt,
    now: ADMIN_FIXTURE_NOW,
    onApprove: fn(),
    onReject: fn(),
  },
} satisfies Meta<typeof NameChangeRequestCard>

export default meta
type Story = StoryObj<typeof meta>

export const WithActions: Story = {}
export const ReadOnly: Story = { args: { onApprove: undefined, onReject: undefined } }
export const Disabled: Story = { args: { disabled: true } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const WithActionsLight: Story = { globals: { theme: 'light' } }
export const ReadOnlyLight: Story = { ...ReadOnly, globals: { theme: 'light' } }
