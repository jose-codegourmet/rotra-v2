import { type SessionDoneScenario, sessionDoneFixtures } from '@rotra/data/fixtures/session-done'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SessionDoneSheet, type SessionDoneSheetProps } from './SessionDoneSheet'

/** "7:00 PM" in the viewer's locale, like the prototype's fmtTime. */
const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** The sheet's value props for one fixture scenario. */
function scenario({ startedAt, endsAt, ...rest }: SessionDoneScenario) {
  return { ...rest, timeRange: `${time(startedAt)}–${time(endsAt)}` }
}

const callbacks = {
  open: true,
  onOpenChange: fn(),
  onBackToSession: fn(),
  onContinue: fn(),
  onContinueToFinish: fn(),
  onBack: fn(),
  onConfirm: fn(),
} satisfies Partial<SessionDoneSheetProps>

const meta = {
  title: 'Queue/SessionDoneSheet',
  component: SessionDoneSheet,
  args: { ...callbacks, ...scenario(sessionDoneFixtures.clean), step: 'review', online: true },
} satisfies Meta<typeof SessionDoneSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Everything synced, nothing in play or waiting, everyone met the minimum: Continue is enabled. */
export const ReviewClean: Story = {}

/** Two games in play block the flow: the error notice names the courts and Continue is disabled. */
export const ReviewWithGamesInPlay: Story = {
  args: { ...scenario(sessionDoneFixtures.inPlay), pendingChanges: 2 },
}

/** Unplayed waiting matches and players under the minimum: the primary is Review shortfalls. */
export const ReviewWithUnplayedAndShortfalls: Story = {
  args: scenario(sessionDoneFixtures.shortfalls),
}

/** Offline: the review still shows, but Continue is disabled until the device reconnects. */
export const ReviewOffline: Story = {
  args: { ...scenario(sessionDoneFixtures.shortfalls), online: false, pendingChanges: 3 },
}

/** D-MINIMUM: each name with "g of M"; long names wrap and the count stays on the row. */
export const MinimumShortfallList: Story = {
  args: { ...scenario(sessionDoneFixtures.longNames), step: 'minimum' },
  globals: { viewport: { value: 'phone' } },
}

/** D-SESSION-DONE with everything synced: Confirm Session done is enabled. */
export const ConfirmSynced: Story = {
  args: { ...scenario(sessionDoneFixtures.clean), step: 'confirm' },
}

/** D-SESSION-DONE with changes still syncing: Confirm Session done is disabled. */
export const ConfirmPendingChanges: Story = {
  args: { ...scenario(sessionDoneFixtures.clean), step: 'confirm', pendingChanges: 3 },
}

/** Finalization running: the primary spins, Back and Close are blocked. */
export const ConfirmPendingSubmit: Story = {
  args: { ...scenario(sessionDoneFixtures.clean), step: 'confirm', isPending: true },
}

/** The review at 375 px: the bottom sheet, labels above values. */
export const Phone: Story = {
  args: scenario(sessionDoneFixtures.inPlay),
  globals: { viewport: { value: 'phone' } },
}

export const Desktop: Story = {
  args: scenario(sessionDoneFixtures.shortfalls),
  globals: { viewport: { value: 'desktop' } },
}
