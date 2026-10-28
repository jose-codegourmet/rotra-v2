import type { ClubPlayer } from '@rotra/data/club-player/types'
import { clubPlayers, players, storyIdentityPlayers } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PlayerProfileSheet, type PlayerProfileSheetProps } from './PlayerProfileSheet'

const CITY: Record<string, string> = {
  CEB: 'Cebu City',
  MNL: 'Manila',
  DVO: 'Davao City',
  ILO: 'Iloilo City',
}
const rtrOf = (p: ClubPlayer) => players.find((x) => x.id === p.playerId)?.rtrId ?? null
const cityOf = (p: ClubPlayer) => {
  const code = /^RTR-[A-Z]{2}-([A-Z]{3})-/.exec(rtrOf(p) ?? '')?.[1]
  return code ? (CITY[code] ?? code) : null
}
const byName = (name: string) => {
  const p = clubPlayers.find((x) => x.fullName === name)
  if (!p) throw new Error(`${name} missing from fixtures`)
  return p
}

// Sessions here, added dates and hidden phones are not in the F06.2 fixtures yet; values are the Queue
// prototype's for these players (Jose and Mikee Abellana hide their phones).
const propsFor = (
  p: ClubPlayer,
  extra: Partial<PlayerProfileSheetProps> = {},
): PlayerProfileSheetProps => ({
  open: true,
  onOpenChange: fn(),
  name: p.fullName,
  identity: p.identity,
  nickname: p.nickname,
  level: p.playingLevel,
  registeredCity: cityOf(p),
  rtrId: rtrOf(p),
  addedLabel: 'October 3, 2026',
  sessionsHere: 6,
  phoneHidden: false,
  onInvite: fn(),
  ...extra,
})

const meta = {
  title: 'Queue/PlayerProfileSheet',
  component: PlayerProfileSheet,
  args: propsFor(byName('Aaron'), { sessionsHere: 7 }),
} satisfies Meta<typeof PlayerProfileSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Registered: Story = {}
export const HiddenPhone: Story = { args: propsFor(byName('Jose'), { phoneHidden: true }) }
export const Unclaimed: Story = {
  args: propsFor(storyIdentityPlayers.unclaimed, { sessionsHere: 5 }),
}
export const Guest: Story = { args: propsFor(storyIdentityPlayers.guest, { sessionsHere: 1 }) }
export const LookupPending: Story = {
  args: propsFor(storyIdentityPlayers.guest, { identity: 'pending', sessionsHere: 0 }),
}
export const OpenedFromMatch: Story = { args: { backLabel: 'match', onBack: fn() } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
