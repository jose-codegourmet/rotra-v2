import type { ClubPlayer } from '@rotra/data/club-player/types'
import { clubPlayers, players } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SavedPlayerCard, type SavedPlayerCardProps } from './SavedPlayerCard'

// The prototype derives the registered city from the RTR ID's city code (regCity()).
const CITY: Record<string, string> = {
  CEB: 'Cebu City',
  MNL: 'Manila',
  DVO: 'Davao City',
  ILO: 'Iloilo City',
}
const rtrOf = (p: ClubPlayer) => players.find((x) => x.id === p.playerId)?.rtrId
const cityOf = (p: ClubPlayer) => {
  const code = /^RTR-[A-Z]{2}-([A-Z]{3})-/.exec(rtrOf(p) ?? '')?.[1]
  return code ? (CITY[code] ?? code) : null
}
const byIdentity = (identity: ClubPlayer['identity']) => {
  const p = clubPlayers.find((x) => x.identity === identity)
  if (!p) throw new Error(`No ${identity} player in fixtures`)
  return p
}

// Sessions-here counts and added dates are not in the F06.2 fixtures yet; the values below are the
// Queue prototype's `prior` counts for these players.
const propsFor = (p: ClubPlayer, sessionsHere: number): SavedPlayerCardProps => ({
  name: p.fullName,
  nickname: p.nickname,
  identity: p.identity,
  level: p.playingLevel,
  registeredCity: cityOf(p),
  sessionsHere,
  addedLabel: 'Oct 3',
  onOpenProfile: fn(),
  onInvite: fn(),
})

const meta = {
  title: 'Queue/SavedPlayerCard',
  component: SavedPlayerCard,
  decorators: [
    (Story) => (
      <div className="w-[180px]">
        <Story />
      </div>
    ),
  ],
  args: propsFor(byIdentity('registered'), 6),
} satisfies Meta<typeof SavedPlayerCard>

export default meta
type Story = StoryObj<typeof meta>

export const Registered: Story = {}
export const Unclaimed: Story = { args: propsFor(byIdentity('unclaimed'), 5) }
export const Guest: Story = { args: propsFor(byIdentity('guest'), 1) }
export const LookupPending: Story = {
  args: { ...propsFor(byIdentity('guest'), 0), identity: 'pending', registeredCity: null },
}
export const PlayingNow: Story = { args: { live: { kind: 'playing', text: 'Playing · Court 1' } } }
export const AtTheSession: Story = { args: { live: { kind: 'waiting', text: 'At the session' } } }
export const NoLevel: Story = { args: { level: null } }

export const LongNameAndNickname: Story = {
  args: {
    name: `${byIdentity('unclaimed').fullName} Bautista Villareal`,
    nickname: 'Raymark the smash machine',
  },
}

export const Grid: Story = {
  decorators: [
    (Story) => (
      <div className="grid w-[343px] grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))] gap-3">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      {clubPlayers.slice(0, 6).map((p) => (
        <SavedPlayerCard key={p.id} {...propsFor(p, 5)} />
      ))}
    </>
  ),
  globals: { viewport: { value: 'phone' } },
}
