import {
  GAB_PLAYER_ID,
  JOSE_PLAYER_ID,
  players,
  storyIdentityPlayers,
} from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useId, useState } from 'react'
import { VsCard, type VsCardProps } from './VsCard'

const jose = players.find((player) => player.id === JOSE_PLAYER_ID)
if (!jose) throw new Error('Missing the signed-in player fixture.')
const guestId = storyIdentityPlayers.guest.id
const maskedPlayerId = 'jasper'
const left: VsCardProps['left'] = [
  {
    id: JOSE_PLAYER_ID,
    name: jose.fullName,
    picture: null,
    skillGroup: 'intermediate',
    guest: false,
  },
  { id: guestId, name: 'A***', picture: null, skillGroup: null, guest: true },
]
const right: VsCardProps['right'] = [
  { id: GAB_PLAYER_ID, name: 'Gab Torres', picture: null, skillGroup: 'advanced', guest: false },
  {
    id: maskedPlayerId,
    name: 'J*** R***',
    picture: null,
    skillGroup: null,
    guest: false,
  },
]

function InteractiveVsCard(args: VsCardProps) {
  const id = useId()
  const [picked, setPicked] = useState(() => args.picked.map((key) => `${id}-${key}`))
  const withId = (player: VsCardProps['left'][number]) => ({
    ...player,
    id: `${id}-${player.id}`,
  })
  return (
    <div className="mx-auto max-w-[365px]">
      <VsCard
        {...args}
        left={args.left.map(withId)}
        right={args.right.map(withId)}
        picked={picked}
        onPickPlayer={(playerId) =>
          setPicked((current) =>
            current.includes(playerId) ? current.filter((key) => key !== playerId) : [playerId],
          )
        }
        onPickTeam={(team) =>
          setPicked((current) => (team.every((key) => current.includes(key)) ? [] : team))
        }
      />
    </div>
  )
}

const meta = {
  title: 'Player/VsCard',
  component: VsCard,
  render: (args) => <InteractiveVsCard {...args} />,
  args: {
    format: 'doubles',
    score: '18–21',
    left,
    right,
    winner: 'right',
    picked: [],
    onPickPlayer: () => {},
    onPickTeam: () => {},
  },
} satisfies Meta<typeof VsCard>

export default meta
type Story = StoryObj<typeof meta>

export const NothingPicked: Story = { globals: { theme: 'dark' } }
export const NothingPickedLight: Story = { globals: { theme: 'light' } }
export const PlayerPicked: Story = { args: { picked: [JOSE_PLAYER_ID] } }
export const TeamPicked: Story = { args: { picked: right.map((player) => player.id) } }
export const GuestPicked: Story = { args: { picked: [guestId] } }
export const MaskedPlayerPicked: Story = { args: { picked: [maskedPlayerId] } }
export const You: Story = {
  args: {
    left: left.map((player) =>
      player.id === JOSE_PLAYER_ID ? { ...player, name: 'You' } : player,
    ),
    picked: [JOSE_PLAYER_ID],
  },
}
export const NotCountedWithNoScore: Story = { args: { score: null, winner: null } }
export const ThreePlayerTeam: Story = {
  args: {
    format: 'fun_3v3',
    left: [
      ...left,
      { id: 'dalton', name: 'Dalton', picture: null, skillGroup: 'beginner', guest: false },
    ],
    right: [
      ...right,
      { id: 'visitor', name: 'M*** T***', picture: null, skillGroup: null, guest: true },
    ],
  },
}

export const PlayerPickedLight: Story = { ...PlayerPicked, globals: { theme: 'light' } }
export const TeamPickedLight: Story = { ...TeamPicked, globals: { theme: 'light' } }
export const GuestPickedLight: Story = { ...GuestPicked, globals: { theme: 'light' } }
export const MaskedPlayerPickedLight: Story = { ...MaskedPlayerPicked, globals: { theme: 'light' } }
export const YouLight: Story = { ...You, globals: { theme: 'light' } }
