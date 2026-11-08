import type { Meta, StoryObj } from '@storybook/react-vite'
import { PasswordResetRequests } from './PasswordResetRequests'

const request = {
  id: 'request-1',
  email: 'jose@example.com',
  playerName: 'Jose Adrian',
  playerId: 'player-1',
  rtrId: 'RTR-PH-CEB-20261021-0001',
  status: 'pending' as const,
  requestedAt: '2026-11-08T08:00:00Z',
  reviewedAt: null,
  reviewedBy: null,
  canIssue: true,
}
const meta = {
  title: 'Admin/PasswordResetRequests',
  component: PasswordResetRequests,
  args: {
    data: { rows: [request], page: 1, total: 1 },
    onRetry: () => {},
    onPage: () => {},
    onReview: () => {},
    onCopy: () => {},
  },
  decorators: [
    (Story) => (
      <div className="flex flex-col gap-4 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PasswordResetRequests>
export default meta
type Story = StoryObj<typeof meta>
export const Pending: Story = {}
export const Issued: Story = {
  args: {
    data: {
      rows: [
        {
          ...request,
          status: 'issued',
          reviewedAt: request.requestedAt,
          reviewedBy: 'ROTRA Admin',
        },
      ],
      page: 1,
      total: 1,
    },
    link: { requestId: request.id, url: 'https://player.rotra.club/reset-password/prototype-only' },
  },
}
export const Declined: Story = {
  args: { data: { rows: [{ ...request, status: 'declined' }], page: 1, total: 1 } },
}
export const Unmatched: Story = {
  args: {
    data: {
      rows: [{ ...request, playerId: null, playerName: null, rtrId: null, canIssue: false }],
      page: 1,
      total: 1,
    },
  },
}
export const Loading: Story = { args: { data: undefined } }
export const Empty: Story = { args: { data: { rows: [], page: 1, total: 0 } } }
export const LoadError: Story = { args: { error: 'Check your connection and try again.' } }
export const Saving: Story = { args: { pendingId: request.id } }
export const ActionError: Story = {
  args: { actionError: "Couldn't generate a reset link. Check the account and try again." },
}
export const LongEmail: Story = {
  args: {
    data: {
      rows: [
        {
          ...request,
          email: 'very.long.email.for.a.player.account.with.many.characters@example.com',
        },
      ],
      page: 1,
      total: 1,
    },
  },
}
