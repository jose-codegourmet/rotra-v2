import type { ClubPlayer } from '@rotra/data/club-player/types'
import { clubPlayers, directoryPlayers, players } from '@rotra/data/fixtures/players'
import type { PlayingLevel } from '@rotra/data/player/types'
import type { IdentityCheck } from '@rotra/data/session-roster/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { PlayerConfirmCard, type PlayerConfirmCardProps } from './PlayerConfirmCard'

const rtrOf = (p: ClubPlayer) => players.find((x) => x.id === p.playerId)?.rtrId ?? null
const byIdentity = (identity: ClubPlayer['identity']) => {
  const p = clubPlayers.find((x) => x.identity === identity)
  if (!p) throw new Error(`No ${identity} player in fixtures`)
  return p
}
const unclaimed = byIdentity('unclaimed')
const registered = byIdentity('registered')
const guest = byIdentity('guest')
// Sam: the Queue prototype's unclaimed Player Information suggestion (Beginner High).
const leo = directoryPlayers[2]
if (!leo) throw new Error('Directory fixture missing')

const propsFor = (p: ClubPlayer): PlayerConfirmCardProps => ({
  name: p.fullName,
  rtrId: rtrOf(p),
  identity: p.identity,
  suggestion: p.playingLevel,
  level: p.playingLevel,
  onLevelChange: fn(),
  onCheckChange: fn(),
  onBack: fn(),
  onConfirm: fn(),
})

/** Holds the level and the identity check like the sheet does. */
function Demo(props: PlayerConfirmCardProps) {
  const [level, setLevel] = useState<PlayingLevel | null>(props.level)
  const [check, setCheck] = useState<IdentityCheck | null>(props.check ?? null)
  return (
    <PlayerConfirmCard
      {...props}
      level={level}
      onLevelChange={setLevel}
      check={check}
      onCheckChange={setCheck}
    />
  )
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
  args: propsFor(unclaimed),
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof PlayerConfirmCard>

export default meta
type Story = StoryObj<typeof meta>

/** Andrew from Saved players: the primary waits until a check is chosen. */
export const UnclaimedNoCheck: Story = {}

export const UnclaimedChecked: Story = { args: { check: 'rtr-id' } }

export const HiddenPhone: Story = { args: { phoneHidden: true } }

/** Sam from Player Information: no level yet at this club, preset to the suggestion. */
export const FromPlayerInformation: Story = {
  args: {
    name: leo.fullName,
    rtrId: leo.rtrId,
    identity: 'unclaimed',
    suggestion: 'beginner_high',
    level: 'beginner_high',
  },
}

export const Registered: Story = { args: propsFor(registered) }

export const Guest: Story = { args: { ...propsFor(guest), level: null } }

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
