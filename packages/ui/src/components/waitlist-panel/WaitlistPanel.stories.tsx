import { clubPlayers } from '@rotra/data/fixtures/players'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import { sessionWaitlistFixture } from '@rotra/data/fixtures/sessionWaitlist'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { WaitlistPanel, type WaitlistPanelEntry } from './WaitlistPanel'

// The tonight fixture: 14 of 24 slots used (3 courts × 8 players), three saved players waiting.
const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')
const COURTS = queueSessionFixtures.courts.filter((c) => c.sessionId === tonight.id).length
const ROSTER = queueSessionFixtures.roster.length

// The prototype's fmtTime()
const timeOf = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

const entries: WaitlistPanelEntry[] = sessionWaitlistFixture.map((w) => {
  const p = clubPlayers.find((x) => x.id === w.clubPlayerId)
  if (!p) throw new Error('Club player fixture missing')
  return {
    id: w.id,
    name: p.fullName,
    level: w.level,
    waitingSinceLabel: timeOf(w.addedAt),
  }
})

const meta = {
  title: 'Queue/WaitlistPanel',
  component: WaitlistPanel,
  decorators: [
    (Story) => (
      <div className="max-w-4xl">
        <Story />
      </div>
    ),
  ],
  args: {
    entries,
    rosterCount: ROSTER,
    courtCount: COURTS,
    playersPerCourt: tonight.playersPerCourt,
    onFillOpenSlots: fn(),
    onGiveSlot: fn(),
    onRemove: fn(),
    onOpenProfile: fn(),
  },
} satisfies Meta<typeof WaitlistPanel>

export default meta
type Story = StoryObj<typeof meta>

/** 10 open slots and three waiting: Fill 3 open slots, Give slot */
export const OpenSlots: Story = {}
export const Empty: Story = { args: { entries: [] } }
/** Every slot taken: no Fill button, Give slot anyway */
export const FullWithWaitlist: Story = {
  args: { rosterCount: COURTS * tonight.playersPerCourt },
}
export const FullEmpty: Story = {
  args: { entries: [], rosterCount: COURTS * tonight.playersPerCourt },
}
/** More slots given than the budget allows */
export const OverBudget: Story = {
  args: { rosterCount: COURTS * tonight.playersPerCourt + 2 },
}
export const OneCourt: Story = { args: { courtCount: 1, rosterCount: 6 } }
export const Phone: Story = {
  args: { rosterCount: COURTS * tonight.playersPerCourt },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
