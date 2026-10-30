import type { ContactCheck } from '@rotra/data/contact-change-request/types'
import {
  adminContactRequestExamples,
  adminContactReviewExamples,
  contactChangeExamples,
} from '@rotra/data/fixtures/contact-change-requests'
import { players } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ContactChecksList } from './ContactChecksList'

const { now } = adminContactReviewExamples
// Karl's two email requests (prototype r3/r4): the older one is blocked by the newer.
const [newer] = adminContactRequestExamples.twoEmails
if (!newer) throw new Error('Two-email request fixture missing')

// Story-only conflict: Jose's requested phone (prototype r2's case) already belongs to Raymark.
const raymark = players.find((player) => player.fullName === 'Raymark')

const allPass: ContactCheck[] = [
  { kind: 'linked-elsewhere', ok: true },
  { kind: 'newer-request', ok: true },
  { kind: 'original-changed', ok: true },
  { kind: 'in-progress', ok: true },
]

function failing(check: ContactCheck): ContactCheck[] {
  return allPass.map((entry) => (entry.kind === check.kind ? check : entry))
}

const meta = {
  title: 'Admin/ContactChecksList',
  component: ContactChecksList,
  args: {
    field: 'phone',
    checks: allPass,
    onOpenPlayer: fn(),
    onOpenRequest: fn(),
    now,
  },
  decorators: [(Story) => <div className="mx-auto max-w-[640px]">{Story()}</div>],
} satisfies Meta<typeof ContactChecksList>

export default meta
type Story = StoryObj<typeof meta>

/** Jose's phone request (prototype r1): nothing blocks Approve. */
export const AllPass: Story = {}
export const LinkedElsewhere: Story = {
  args: {
    checks: failing({
      kind: 'linked-elsewhere',
      ok: false,
      otherPlayer: raymark && { id: raymark.id, fullName: raymark.fullName, rtrId: raymark.rtrId },
    }),
  },
}
export const NewerRequest: Story = {
  args: {
    field: 'email',
    checks: failing({
      kind: 'newer-request',
      ok: false,
      newerRequestId: newer.requestId,
      sentAt: newer.requestedAt,
    }),
  },
}
export const OriginalChanged: Story = {
  args: {
    checks: failing({
      kind: 'original-changed',
      ok: false,
      currentValue: contactChangeExamples.phone.to,
    }),
  },
}
/** The current value was removed: "It's now not set." */
export const OriginalNotSet: Story = {
  args: { checks: failing({ kind: 'original-changed', ok: false, currentValue: '' }) },
}
export const InProgress: Story = {
  args: { checks: failing({ kind: 'in-progress', ok: false }) },
}
export const Phone: Story = {
  args: LinkedElsewhere.args,
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = {
  args: LinkedElsewhere.args,
  globals: { viewport: { value: 'desktop' } },
}
export const Light: Story = { args: LinkedElsewhere.args, globals: { theme: 'light' } }
