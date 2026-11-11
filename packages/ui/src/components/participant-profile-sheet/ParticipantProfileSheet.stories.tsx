import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ParticipantProfileSheet } from './ParticipantProfileSheet'

const withPhoto = playerProfiles.find((p) => p.picture)
const withoutPhoto = playerProfiles.find((p) => !p.picture) ?? playerProfiles[0]

const meta = {
  title: 'Queue/PublicSession/ParticipantProfileSheet',
  component: ParticipantProfileSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    name: withPhoto?.fullName ?? 'Aaron',
    nickname: withPhoto?.nickname ?? 'Ace',
    photoUrl: withPhoto?.picture ?? undefined,
    onPhotoClick: fn(),
    levelLabel: 'Intermediate High',
    tonight: { kind: 'playing', courtLabel: 'Court 2' },
    registeredCity: 'Cebu City',
    rtrId: withPhoto?.rtrId ?? 'RTR-PH-CEB-040226-0007',
    stats: { games: 42, wins: 25, losses: 17, winRate: 60 },
    profileHref: `/player/find/${withPhoto?.rtrId ?? 'RTR-PH-CEB-040226-0007'}`,
  },
} satisfies Meta<typeof ParticipantProfileSheet>

export default meta
type Story = StoryObj<typeof meta>

/** All stories support both themes through the Theme toolbar. */
export const WithPhoto: Story = {}
export const Initials: Story = {
  args: {
    name: withoutPhoto?.fullName ?? 'Gab',
    nickname: null,
    photoUrl: undefined,
    rtrId: withoutPhoto?.rtrId ?? 'RTR-PH-CEB-040226-0007',
  },
}
export const NoGamesYet: Story = { args: { stats: null } }
export const StatsLoading: Story = { args: { stats: null, statsLoading: true } }
export const StatsFailed: Story = { args: { stats: null, statsError: true } }
export const GettingReady: Story = {
  args: { tonight: { kind: 'getting-ready', courtLabel: 'Court 1' } },
}
export const Queued: Story = { args: { tonight: { kind: 'queued', position: 2 } } }
export const Away: Story = { args: { tonight: { kind: 'away' } } }
/** On the waitlist, or not in this session: no Tonight line. */
export const NotOnRoster: Story = { args: { tonight: null } }
export const NoLevelYet: Story = { args: { levelLabel: null } }
/** The viewer's own tile opens their full card, always-private or not. */
export const OwnProfile: Story = { args: { tonight: { kind: 'free' } } }
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
