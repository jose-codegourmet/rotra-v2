import type { AdminPlayer, AdminPlayerEdit } from '@rotra/data/admin-player/types'
import { managementPlayer } from '@rotra/data/fixtures/admin-player-management'
import { adminPlayerDetailExamples } from '@rotra/data/fixtures/admin-players'
import { CLAIM_TOKEN } from '@rotra/data/fixtures/player-accounts'
import { JOSE_SESSIONS } from '@rotra/data/fixtures/player-games'
import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { profileCharacters } from '@rotra/data/fixtures/profile-characters'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminPlayerQuickView } from './AdminPlayerQuickView'

const profile = playerProfiles[0]
const registered = {
  ...managementPlayer,
  ...adminPlayerDetailExamples.contact.hidden,
  name: profile?.fullName ?? managementPlayer.name,
  rtrId: profile?.rtrId ?? managementPlayer.rtrId,
  picture: profile?.picture ?? null,
  levelIndex: 6,
}
const characters = profileCharacters
  .filter((c) => c.shown)
  .map(({ id, image, number }) => ({ id, image, number }))
/** The A-PLAYER-EDIT record the Edit view loads for a directory row. */
const editOf = (player: AdminPlayer): AdminPlayerEdit => ({
  ...player,
  playingStyle: player.claimed ? (profile?.playingStyle ?? '') : '',
  experienceYears: player.claimed ? (profile?.experienceYears ?? null) : null,
  experienceMonths: player.claimed ? (profile?.experienceMonths ?? null) : null,
  socialLinks: {
    facebook: '',
    instagram: '',
    youtube: '',
    linkedin: '',
    ...(player.claimed ? profile?.socialLinks : {}),
  },
  profilePrivate: false,
  previousPicture: null,
  hasAccount: true,
  passwordSetAt: null,
})
const editProps = (player: AdminPlayer) => ({
  player: editOf(player),
  characters,
  createdBy: 'Admin',
  cropPhoto: async () => characters[0]?.image ?? '',
  onSubmit: () => {},
  onNothingChanged: () => {},
  onReload: () => {},
})
const meta = {
  title: 'Admin/AdminPlayerQuickView',
  component: AdminPlayerQuickView,
  args: {
    open: true,
    onClose: () => {},
    player: registered,
    createdBy: 'Created by Admin',
    pendingRequests: 0,
    sessions: JOSE_SESSIONS,
    socialLinks: profile?.socialLinks,
    profileHref: '#profile',
    historyHref: '#game-history',
    onRetry: () => {},
    onRetryGames: () => {},
    onCopyId: () => {},
    bannerKey: 'night',
    year: 2026,
    stats: { games: 24, wins: 15, losses: 9, winRate: 63 },
    rotraProfileHref: '#rotra-profile',
    onShare: () => {},
    edit: editProps(registered),
    onInvite: () => {},
    onCopyRegistrationLink: () => {},
  },
} satisfies Meta<typeof AdminPlayerQuickView>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }
export const Unclaimed: Story = {
  args: { player: managementPlayer, socialLinks: undefined, bannerKey: 'court', stats: null },
}
/** A registered player with no games this year. */
export const NoGamesThisYear: Story = { args: { stats: null } }
export const UnclaimedLight: Story = { ...Unclaimed, globals: { theme: 'light' } }
export const Edit: Story = { args: { initialMode: 'edit' } }
export const EditLight: Story = { ...Edit, globals: { theme: 'light' } }
export const EditUnclaimed: Story = {
  args: { player: managementPlayer, initialMode: 'edit', edit: editProps(managementPlayer) },
}
export const EditUnclaimedLight: Story = { ...EditUnclaimed, globals: { theme: 'light' } }
export const EditPending: Story = {
  args: { ...Edit.args, edit: { ...meta.args.edit, isPending: true } },
}
export const EditPendingLight: Story = { ...EditPending, globals: { theme: 'light' } }
/** The edit record is still loading: Save changes is off. */
export const EditLoading: Story = { args: { ...Edit.args, edit: undefined } }
export const EditLoadingLight: Story = { ...EditLoading, globals: { theme: 'light' } }
export const EditFieldErrors: Story = {
  args: {
    ...Edit.args,
    edit: {
      ...meta.args.edit,
      fieldErrors: {
        phone: 'This phone number is already linked to another player.',
        email: 'This email is already linked to another player.',
      },
    },
  },
}
export const EditFieldErrorsLight: Story = { ...EditFieldErrors, globals: { theme: 'light' } }
export const EditError: Story = {
  args: {
    ...Edit.args,
    edit: { ...meta.args.edit, serverError: "Couldn't save the profile. Try again." },
  },
}
export const EditErrorLight: Story = { ...EditError, globals: { theme: 'light' } }
export const Invite: Story = {
  args: {
    player: managementPlayer,
    initialMode: 'invite',
    registrationLink: `https://rotra.example/claim/${CLAIM_TOKEN}`,
  },
}
export const InviteLight: Story = { ...Invite, globals: { theme: 'light' } }
export const InvitePending: Story = {
  args: { ...Invite.args, registrationLink: undefined, invitePending: true },
}
export const InvitePendingLight: Story = { ...InvitePending, globals: { theme: 'light' } }
export const InviteError: Story = {
  args: {
    ...InvitePending.args,
    invitePending: false,
    inviteError: "Couldn't create the registration link.",
  },
}
export const InviteErrorLight: Story = { ...InviteError, globals: { theme: 'light' } }
export const EmptyHistory: Story = { args: { sessions: [] } }
export const EmptyHistoryLight: Story = { ...EmptyHistory, globals: { theme: 'light' } }
export const Loading: Story = { args: { player: undefined } }
export const LoadingLight: Story = { ...Loading, globals: { theme: 'light' } }
export const LoadError: Story = { args: { error: true } }
export const ErrorLight: Story = { ...LoadError, globals: { theme: 'light' } }
export const NotFound: Story = { args: { player: null } }
export const NotFoundLight: Story = { ...NotFound, globals: { theme: 'light' } }
export const HistoryLoading: Story = { args: { sessions: undefined } }
export const HistoryLoadingLight: Story = { ...HistoryLoading, globals: { theme: 'light' } }
export const HistoryError: Story = { args: { gamesError: true } }
export const HistoryErrorLight: Story = { ...HistoryError, globals: { theme: 'light' } }
export const LongName: Story = {
  args: {
    player: {
      ...registered,
      name: 'Maria Consolacion Villanueva-Bautista',
      email: 'maria.consolacion.villanueva.bautista@example.com',
    },
  },
}
export const LongNameLight: Story = { ...LongName, globals: { theme: 'light' } }
