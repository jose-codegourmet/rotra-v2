import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { IdentityChip } from '@rotra/ui/identity-chip'
import { KeyValueList } from '@rotra/ui/key-value-list'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import {
  ProfileBannerCard,
  ProfileCardSection,
  ProfileLevelBadge,
  ProfileStatsSection,
} from './ProfileBannerCard'

const withPhoto = playerProfiles.find((p) => p.picture)

const meta = {
  title: 'Queue/ProfileBannerCard',
  component: ProfileBannerCard,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[560px] overflow-hidden rounded-2xl border border-border-strong bg-surface">
        <Story />
      </div>
    ),
  ],
  args: {
    name: withPhoto?.fullName ?? 'Aaron',
    nickname: 'Ace',
    rtrId: 'RTR-PH-CEB-040226-0007',
    profileLink: { href: '/find/RTR-PH-CEB-040226-0007', newTab: true },
    photoUrl: withPhoto?.picture ?? undefined,
    onPhotoClick: fn(),
    bannerKey: 'court',
    chips: (
      <>
        <IdentityChip identity="registered" />
        <ProfileLevelBadge>Intermediate High</ProfileLevelBadge>
      </>
    ),
    tonight: { kind: 'playing', courtLabel: 'Court 2' },
    children: (
      <>
        <ProfileCardSection label="About">
          <KeyValueList items={[{ label: 'Registered in', value: 'Cebu City' }]} />
        </ProfileCardSection>
        <ProfileStatsSection year={2026} stats={{ games: 42, wins: 25, losses: 17, winRate: 60 }} />
      </>
    ),
  },
} satisfies Meta<typeof ProfileBannerCard>

export default meta
type Story = StoryObj<typeof meta>

/** All stories support both themes through the Theme toolbar. */
export const Playing: Story = {}
export const GettingReady: Story = {
  args: { tonight: { kind: 'getting-ready', courtLabel: 'Court 1 + Court 2' } },
}
export const Queued: Story = { args: { tonight: { kind: 'queued', position: 3 } } }
export const FreeShortWait: Story = { args: { tonight: { kind: 'free', restMinutes: 4 } } }
export const FreeWaitWarn: Story = { args: { tonight: { kind: 'free', restMinutes: 12 } } }
export const FreeWaitLong: Story = { args: { tonight: { kind: 'free', restMinutes: 18 } } }
export const Away: Story = { args: { tonight: { kind: 'away' } } }
/** Not live, or not on tonight's roster: no pill. */
export const NoPill: Story = { args: { tonight: null } }
/** No nickname: the full name leads alone. */
export const NoNickname: Story = { args: { nickname: null } }
/** Inside the Player app: a forward arrow, same tab. */
export const PlayerApp: Story = {
  args: {
    idLabel: 'player ID',
    profileLink: { href: '/players/p1', newTab: false, onNavigate: fn() },
  },
}
/** Guests and unclaimed records: no RTR ID button, no profile icon. */
export const NoRtrId: Story = { args: { rtrId: null, profileLink: null } }
export const Initials: Story = { args: { photoUrl: undefined } }
export const AdminSize: Story = { args: { pictureSize: 72, tonight: null } }
export const LongName: Story = {
  args: {
    name: 'Maria Consolacion Villanueva-Bautista',
    nickname: 'The Unstoppable Shuttle Commander',
  },
}
export const NoGamesThisYear: Story = {
  args: {
    tonight: null,
    children: <ProfileStatsSection year={2026} stats={null} />,
  },
}
/** Latest stats: a low win rate keeps the fire to an ember */
export const LowWinRate: Story = {
  args: {
    tonight: null,
    children: <ProfileStatsSection year={2026} stats={{ games: 25, wins: 3, losses: 22, winRate: 12 }} />,
  },
}
/** 100%: the largest fire (above the number under 420 px) */
export const PerfectWinRate: Story = {
  args: {
    tonight: null,
    children: <ProfileStatsSection year={2026} stats={{ games: 9, wins: 9, losses: 0, winRate: 100 }} />,
  },
}
export const PerfectWinRatePhoneLight: Story = {
  ...PerfectWinRate,
  globals: { theme: 'light', viewport: { value: 'phone' } },
}
/** 0%: no fire */
export const ZeroWinRate: Story = {
  args: {
    tonight: null,
    children: <ProfileStatsSection year={2026} stats={{ games: 4, wins: 0, losses: 4, winRate: 0 }} />,
  },
}
export const NightBanner: Story = { args: { bannerKey: 'night' } }
export const StripeBanner: Story = { args: { bannerKey: 'stripe' }, globals: { theme: 'light' } }
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
