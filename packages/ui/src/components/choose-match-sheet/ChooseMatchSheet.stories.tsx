import type { MatchCardFixture } from '@rotra/data/fixtures/match-cards'
import { matchCardFixtures } from '@rotra/data/fixtures/match-cards'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { type ChooseMatchItem, ChooseMatchSheet } from './ChooseMatchSheet'

const itemOf = (c: MatchCardFixture, position: number): ChooseMatchItem => ({
  matchId: `${c.match.id}-${position}`,
  position,
  matchNo: c.match.matchNo,
  format: c.match.format,
  origin: c.match.origin,
  manualProtected: c.match.manualProtected,
  status: c.status,
  teamA: c.teamA,
  teamB: c.teamB,
  onSelectPlayer: fn(),
})

/** Ready, needs attention, blocked, suggested, auto and a 5v5, in queue order. */
const mixed = matchCardFixtures.upcoming.map((c, i) => itemOf(c, i + 1))

const meta = {
  title: 'Queue/ChooseMatchSheet',
  component: ChooseMatchSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    courtLabel: 'Court 2',
    matches: mixed,
    onPutOnCourt: fn(),
    onEdit: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof ChooseMatchSheet>

export default meta
type Story = StoryObj<typeof meta>

/** #1 is ready; later cards are blocked or need attention (Put on court disabled). */
export const Mixed: Story = {}

/** One match waiting: no arrows to use, no dots to move, no side mask. */
export const OneMatch: Story = { args: { matches: mixed.slice(0, 1) } }

/** Ten ready matches: the next one peeks, arrows and dots move, the mask follows. */
export const TenMatches: Story = {
  args: {
    matches: Array.from({ length: 10 }, (_, i) => itemOf(matchCardFixtures.ready, i + 1)),
  },
}

/** A blocked match: Put on Court 2 is disabled and the status line says why. */
export const Blocked: Story = {
  args: { matches: [itemOf(matchCardFixtures.blocked, 1)] },
}

export const NeedsAttention: Story = {
  args: { matches: [itemOf(matchCardFixtures.needsAttention, 1)] },
}

export const Empty: Story = { args: { matches: [] } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const PhoneLight: Story = {
  globals: { viewport: { value: 'phone' }, theme: 'light' },
}
export const DesktopLight: Story = {
  globals: { viewport: { value: 'desktop' }, theme: 'light' },
}
