import type { ClubPlayer } from '@rotra/data/club-player/types'
import {
  clubPlayers,
  directoryPlayers,
  players,
  storyIdentityPlayers,
} from '@rotra/data/fixtures/players'
import type { PlayingLevel } from '@rotra/data/player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { PlayerConfirmCard, type PlayerConfirmCardProps } from './PlayerConfirmCard'

const rtrOf = (p: ClubPlayer) => players.find((x) => x.id === p.playerId)?.rtrId ?? null
const byIdentity = (identity: ClubPlayer['identity']) => {
  const p = [...clubPlayers, ...Object.values(storyIdentityPlayers)].find(
    (x) => x.identity === identity,
  )
  if (!p) throw new Error(`No ${identity} player in fixtures`)
  return p
}
const unclaimed = byIdentity('unclaimed')
const registered = byIdentity('registered')
const guest = byIdentity('guest')
// Sam: a Player Information suggestion not yet saved at this club (Beginner High).
const leo = directoryPlayers[2]
if (!leo) throw new Error('Directory fixture missing')

const propsFor = (p: ClubPlayer): PlayerConfirmCardProps => ({
  name: p.fullName,
  rtrId: rtrOf(p),
  identity: p.identity,
  suggestion: p.playingLevel,
  level: p.playingLevel,
  onLevelChange: fn(),
  onBack: fn(),
  onConfirm: fn(),
})

/** Holds the level like the sheet does. */
function Demo(props: PlayerConfirmCardProps) {
  const [level, setLevel] = useState<PlayingLevel | null>(props.level)
  return <PlayerConfirmCard {...props} level={level} onLevelChange={setLevel} />
}

const meta = {
  title: 'Queue/PlayerConfirmCard',
  component: PlayerConfirmCard,
  decorators: [
    (Story) => (
      <div className="max-w-[520px]">
        <Story />
      </div>
    ),
  ],
  // Unclaimed players have no RTR ID until they register (D-2026-11-11-03).
  args: { ...propsFor(unclaimed), rtrId: null, suggestion: null, level: null },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof PlayerConfirmCard>

export default meta
type Story = StoryObj<typeof meta>

/** An unclaimed saved player with no level: "Not registered yet", no identity check, pick a level. */
export const UnclaimedNoLevel: Story = {}
export const UnclaimedNoLevelLight: Story = { globals: { theme: 'light' } }

export const HiddenPhone: Story = { args: { phoneHidden: true } }

/** Sam from Player Information: no level yet at this club, preset to the suggestion. */
export const FromPlayerInformation: Story = {
  args: {
    name: leo.fullName,
    rtrId: leo.rtrId,
    identity: 'registered',
    suggestion: 'beginner_high',
    level: 'beginner_high',
  },
}

export const Registered: Story = { args: propsFor(registered) }

export const Guest: Story = { args: { ...propsFor(guest), rtrId: null, level: null } }
export const GuestLight: Story = { ...Guest, globals: { theme: 'light' } }

export const LiveSession: Story = { args: { ...propsFor(registered), live: true } }

export const Full: Story = { args: { ...propsFor(registered), full: true } }

export const MissingLevel: Story = {
  args: {
    ...propsFor(guest),
    level: null,
    error: 'Choose a level for this club before adding.',
  },
}

export const Pending: Story = { args: { ...propsFor(registered), isPending: true } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
