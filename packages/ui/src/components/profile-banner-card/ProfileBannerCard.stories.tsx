import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { IdentityChip } from '@rotra/ui/identity-chip'
import { KeyValueList } from '@rotra/ui/key-value-list'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import {
  ProfileBannerCard,
  ProfileCardSection,
  ProfileLevelBadge,
  ProfileStatTiles,
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
    photoUrl: withPhoto?.picture ?? undefined,
    onPhotoClick: fn(),
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
          <KeyValueList
            items={[
              { label: 'Registered in', value: 'Cebu City' },
              { label: 'RTR ID', value: 'RTR-PH-CEB-040226-0007' },
            ]}
          />
        </ProfileCardSection>
        <ProfileCardSection label="Stats · last 90 days">
          <ProfileStatTiles stats={{ games: 42, wins: 25, losses: 17, winRate: 60 }} />
        </ProfileCardSection>
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
export const Free: Story = { args: { tonight: { kind: 'free' } } }
export const Away: Story = { args: { tonight: { kind: 'away' } } }
/** Not on tonight's roster: no Tonight line. */
export const NotTonight: Story = { args: { tonight: null } }
export const Initials: Story = { args: { photoUrl: undefined } }
export const LongName: Story = {
  args: {
    name: 'Maria Consolacion Villanueva-Bautista',
    nickname: 'The Unstoppable Shuttle Commander',
  },
}
export const NightBanner: Story = { args: { bannerKey: 'night' } }
export const StripeBanner: Story = { args: { bannerKey: 'stripe' }, globals: { theme: 'light' } }
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
