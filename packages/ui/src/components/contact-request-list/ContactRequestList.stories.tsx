import type { ContactChangeRequest } from '@rotra/data/contact-change-request/types'
import { adminContactRequestExamples } from '@rotra/data/fixtures/contact-change-requests'
import { Chip, type ChipProps } from '@rotra/ui/chip'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import {
  ContactRequestList,
  type ContactRequestListItem,
  type ContactRequestNextAction,
} from './ContactRequestList'

// The Admin prototype's REQ chips; A03.3's ContactRequestStatusChip replaces this story-only map.
const CHIP: Record<ContactChangeRequest['status'], { label: string; tone: ChipProps['tone'] }> = {
  pending: { label: 'Waiting for review', tone: 'warn' },
  approved: { label: 'Approved · applying', tone: 'warn' },
  applying: { label: 'Approved · applying', tone: 'warn' },
  applied: { label: 'Applied', tone: 'accent' },
  failed: { label: 'Needs attention', tone: 'error' },
  rejected: { label: 'Not approved', tone: 'neutral' },
}
// The prototype's nextAction() without the blocked checks; rows pass 'Review · blocked' themselves.
const ACTION: Record<ContactChangeRequest['status'], ContactRequestNextAction> = {
  pending: 'Review',
  approved: 'Check status',
  applying: 'Check status',
  applied: 'View',
  failed: 'Retry application',
  rejected: 'View',
}

function toItem(
  request: ContactChangeRequest,
  action = ACTION[request.status],
): ContactRequestListItem {
  const chip = CHIP[request.status]
  return {
    id: request.requestId,
    field: request.field,
    from: request.fromValue,
    to: request.toValue,
    requestedAt: request.requestedAt,
    status: <Chip tone={chip.tone}>{chip.label}</Chip>,
    action,
  }
}

const { now, twoEmails, oneOfEach } = adminContactRequestExamples
const [newer, older] = twoEmails
if (!newer || !older) throw new Error('Contact request fixtures missing')
// The older request is blocked because a newer one for the same email exists.
const several = [toItem(newer), toItem(older, 'Review · blocked')]

const meta = {
  title: 'Admin/ContactRequestList',
  component: ContactRequestList,
  args: { requests: several, now, onOpen: fn() },
} satisfies Meta<typeof ContactRequestList>

export default meta
type Story = StoryObj<typeof meta>

export const Several: Story = {}
export const Empty: Story = { args: { requests: [] } }
/** One row per status, with each next action. */
export const AllStatuses: Story = {
  args: { requests: oneOfEach.map((request) => toItem(request)) },
}
/** The review route isn't built yet (A03); the href here is a placeholder anchor. */
export const AsLinks: Story = {
  args: { requests: several.map((item) => ({ ...item, href: `#${item.id}` })) },
}
export const Phone: Story = {
  args: { requests: oneOfEach.map((request) => toItem(request)) },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }
export const AllStatusesLight: Story = { ...AllStatuses, globals: { theme: 'light' } }
