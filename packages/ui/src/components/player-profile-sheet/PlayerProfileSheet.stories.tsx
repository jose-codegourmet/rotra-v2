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
  profileHref: rtrOf(p) ? `/player/find/${rtrOf(p)}` : null,
  year: 2026,
  stats: p.identity === 'registered' ? { games: 18, wins: 11, losses: 7, winRate: 61 } : null,
  bannerKey: p.identity === 'registered' ? 'dusk' : 'court',
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
/** Registered with a club nickname and an account nickname: the row and the Club nickname button. */
export const WithClubNickname: Story = {
  args: { nickname: 'Migs', clubNickname: 'Kuya Migs', onClubNickname: fn() },
}
export const WithClubNicknameLight: Story = { ...WithClubNickname, globals: { theme: 'light' } }
export const WithClubNicknamePhone: Story = {
  ...WithClubNickname,
  globals: { viewport: { value: 'phone' } },
}
/** Registered with an account nickname and no club nickname: the row reads "None". */
export const NoClubNickname: Story = {
  args: { nickname: 'Migs', clubNickname: null, onClubNickname: fn() },
}
/** Registered with a club nickname and no account nickname. */
export const ClubNicknameNoAccountNickname: Story = {
  args: { nickname: null, clubNickname: 'Kuya Migs', onClubNickname: fn() },
}
/** Registered with neither nickname. */
export const NoNicknames: Story = {
  args: { nickname: null, clubNickname: null, onClubNickname: fn() },
}
/** Opened from another dialog: the row stays, the Club nickname button is left out (Back to match). */
export const ClubNicknameOpenedFromMatch: Story = {
  args: {
    nickname: 'Migs',
    clubNickname: 'Kuya Migs',
    onClubNickname: fn(),
    backLabel: 'match',
    onBack: fn(),
  },
}
export const StatsHidden: Story = { args: { showStats: false } }
export const NoLevelYet: Story = { args: { level: null, tonightLevel: null } }
export const WithPhotoButton: Story = { args: { onPhotoClick: fn() } }
export const Light: Story = {
  args: { tonightLevel: 'intermediate_high', tonight: { kind: 'free' } },
  globals: { theme: 'light' },
}
export const HiddenPhone: Story = { args: propsFor(byName('Jose'), { phoneHidden: true }) }
/**
 * Unclaimed with an email (D-2026-11-16-04): "Saved by your club with their email. Not registered
 * with ROTRA yet", Email "On file and kept private", no Details required notice.
 */
export const Unclaimed: Story = {
  args: propsFor(storyIdentityPlayers.unclaimed, {
    sessionsHere: 5,
    rtrId: null,
    registeredCity: null,
    emailOnFile: true,
  }),
}
/** Gender row: the club gave one for an unclaimed player. */
export const UnclaimedFemale: Story = {
  args: { ...(Unclaimed.args as PlayerProfileSheetProps), gender: 'female' },
}
/** A registered player with no gender: "Not given yet · ROTRA reminds them to add it". */
export const RegisteredNoGender: Story = {
  args: propsFor(byName('Aaron'), { sessionsHere: 7, gender: null }),
}
export const UnclaimedLight: Story = { ...Unclaimed, globals: { theme: 'light' } }
export const UnclaimedPhone: Story = { ...Unclaimed, globals: { viewport: { value: 'phone' } } }
/** An older record with a phone and no email: warn chip, the Details required notice, Email "None on file". */
export const DetailsRequired: Story = {
  args: propsFor(storyIdentityPlayers.unclaimed, {
    sessionsHere: 5,
    rtrId: null,
    registeredCity: null,
    detailsRequired: true,
    emailOnFile: false,
    onEdit: fn(),
    onDelete: fn(),
  }),
}
export const DetailsRequiredLight: Story = { ...DetailsRequired, globals: { theme: 'light' } }
export const DetailsRequiredPhone: Story = {
  ...DetailsRequired,
  globals: { viewport: { value: 'phone' } },
}
export const Guest: Story = { args: propsFor(storyIdentityPlayers.guest, { sessionsHere: 1 }) }
/** Guests and unclaimed players get no Club nickname row and no button, even when both are passed. */
export const GuestNoClubNickname: Story = {
  args: propsFor(storyIdentityPlayers.guest, {
    sessionsHere: 1,
    clubNickname: null,
    onClubNickname: fn(),
  }),
}
export const UnclaimedNoClubNickname: Story = {
  args: propsFor(storyIdentityPlayers.unclaimed, {
    sessionsHere: 5,
    rtrId: null,
    registeredCity: null,
    emailOnFile: true,
    clubNickname: null,
    onClubNickname: fn(),
  }),
}
/** Saved players footer: Delete player, Edit details and Invite. A guest's Email row reads "None on file". */
export const SavedPlayerActions: Story = {
  args: {
    ...propsFor(storyIdentityPlayers.guest, { sessionsHere: 1 }),
    onDelete: () => {},
    onEdit: () => {},
    onInvite: () => {},
  },
}
/** Guest opened from inside another dialog: Back to match, no Edit or Delete. */
export const GuestOpenedFromMatch: Story = {
  args: propsFor(storyIdentityPlayers.guest, {
    sessionsHere: 1,
    backLabel: 'match',
    onBack: fn(),
  }),
}
export const JoinedViaClubLink: Story = { args: { joinedVia: 'club' } }
export const JoinedViaSessionLink: Story = { args: { joinedVia: 'session' } }
/** A guest with their own invite link: the text says this record becomes theirs when they register. */
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
    getInviteLink: async () => 'https://player.rotra.club/claim/X7K2M9Q',
  }),
}
export const LookupPending: Story = {
  args: propsFor(storyIdentityPlayers.guest, { identity: 'pending', sessionsHere: 0 }),
}
export const OpenedFromMatch: Story = { args: { backLabel: 'match', onBack: fn() } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
