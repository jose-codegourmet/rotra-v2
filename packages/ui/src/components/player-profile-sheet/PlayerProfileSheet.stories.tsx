import type { ClubPlayer } from '@rotra/data/club-player/types'
import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { clubPlayers, players, storyIdentityPlayers } from '@rotra/data/fixtures/players'
import { Toaster } from '@rotra/ui/toaster'
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
  photoUrl: playerProfiles.find((x) => x.playerId === p.playerId)?.picture ?? undefined,
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

/** All stories support both themes through the Theme toolbar. Not on tonight's roster: suggestion badge, no Tonight line. */
export const Registered: Story = {}
/** On tonight's roster and playing: “LEVEL tonight” badge and the Tonight · line. */
export const PlayingTonight: Story = {
  args: { tonightLevel: 'intermediate_high', tonight: { kind: 'playing', courtLabel: 'Court 2' } },
}
export const GettingReadyTonight: Story = {
  args: {
    tonightLevel: 'intermediate_high',
    tonight: { kind: 'getting-ready', courtLabel: 'Court 1' },
  },
}
export const QueuedTonight: Story = {
  args: { tonightLevel: 'intermediate_high', tonight: { kind: 'queued', position: 2 } },
}
export const AwayTonight: Story = {
  args: { tonightLevel: 'intermediate_high', tonight: { kind: 'away' } },
}
export const NoLevelYet: Story = { args: { level: null, tonightLevel: null } }
export const WithPhotoButton: Story = { args: { onPhotoClick: fn() } }
export const Light: Story = {
  args: { tonightLevel: 'intermediate_high', tonight: { kind: 'free' } },
  globals: { theme: 'light' },
}
export const HiddenPhone: Story = { args: propsFor(byName('Jose'), { phoneHidden: true }) }
export const Unclaimed: Story = {
  args: propsFor(storyIdentityPlayers.unclaimed, { sessionsHere: 5 }),
}
export const Guest: Story = { args: propsFor(storyIdentityPlayers.guest, { sessionsHere: 1 }) }
/** Saved players footer: Delete player, Edit details and Invite. */
export const SavedPlayerActions: Story = {
  args: {
    ...propsFor(storyIdentityPlayers.guest, { sessionsHere: 1 }),
    onDelete: () => {},
    onEdit: () => {},
    onInvite: () => {},
  },
}
/** Guest record: footer gains Link to saved player…. */
export const GuestWithLink: Story = {
  args: propsFor(storyIdentityPlayers.guest, {
    sessionsHere: 1,
    onLinkToSavedPlayer: fn(),
    onDelete: fn(),
  }),
}
/** Unclaimed profile: no Link to saved player… even if the handler were passed. */
export const UnclaimedNoLink: Story = {
  args: propsFor(storyIdentityPlayers.unclaimed, { sessionsHere: 5, onDelete: fn() }),
}
/** Guest opened from inside another dialog: Back to match, no Link to saved player…. */
export const GuestOpenedFromMatch: Story = {
  args: propsFor(storyIdentityPlayers.guest, {
    sessionsHere: 1,
    backLabel: 'match',
    onBack: fn(),
    onLinkToSavedPlayer: fn(),
  }),
}
export const JoinedViaClubLink: Story = { args: { joinedVia: 'club' } }
export const JoinedViaSessionLink: Story = { args: { joinedVia: 'session' } }
export const GuestWithInvite: Story = {
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
  args: propsFor(storyIdentityPlayers.guest, {
    sessionsHere: 1,
    inviteUrl: 'https://player.rotra.club/register/6cd364d4-0e3a-5c3d-9e75-2116cc845714',
  }),
}
export const LookupPending: Story = {
  args: propsFor(storyIdentityPlayers.guest, { identity: 'pending', sessionsHere: 0 }),
}
export const OpenedFromMatch: Story = { args: { backLabel: 'match', onBack: fn() } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
