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
  const [ownName, setOwnName] = useState(props.ownName ?? '')
  return (
    <PlayerConfirmCard
      {...props}
      level={level}
      onLevelChange={setLevel}
      ownName={ownName}
      onOwnNameChange={setOwnName}
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
  // An older unclaimed record has no RTR ID and no email yet (D-2026-11-16-04).
  args: { ...propsFor(unclaimed), rtrId: null, suggestion: null, level: null },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof PlayerConfirmCard>

export default meta
type Story = StoryObj<typeof meta>

/** An older unclaimed record with no level: "Details required" under the name, pick a level. */
export const UnclaimedNoLevel: Story = { args: { detailsRequired: true } }
export const UnclaimedNoLevelLight: Story = {
  args: { detailsRequired: true },
  globals: { theme: 'light' },
}

/** Another club's unclaimed player: no name, picture or level. This club types its own name. */
export const OtherClubUnclaimed: Story = {
  args: {
    name: '',
    rtrId: 'RTR-PH-MNL-020326-0231',
    nameRequired: true,
    ownName: '',
    onOwnNameChange: fn(),
  },
}
export const OtherClubUnclaimedLight: Story = { ...OtherClubUnclaimed, globals: { theme: 'light' } }
export const OtherClubUnclaimedNameMissing: Story = {
  args: { ...OtherClubUnclaimed.args, nameError: 'Enter a name.' },
}

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
