import { clubs } from '@rotra/data/fixtures/clubs'
import { playerProfileScenarios, playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { leaderboardPlayers } from '@rotra/data/fixtures/players'
import { profileLeaderboardStoryPlaces } from '@rotra/data/fixtures/rank-states'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerIdentityCard } from './PlayerIdentityCard'

const profile = playerProfiles.find((p) => p.fullName === 'Jose')
const initials = playerProfiles.find((p) => p.fullName === 'Raymark')
const unclaimed = playerProfiles.find((p) => p.playerId === leaderboardPlayers[17]?.id)
if (!profile || !initials || !unclaimed) throw new Error('Missing public profile fixture')
const meta = {
  title: 'Player/PlayerIdentityCard',
  component: PlayerIdentityCard,
  args: {
    profile,
    idElementId: 'story-player-id',
    onCopyId: () => {},
    onEdit: () => {},
    onChangePicture: () => {},
    onChangeBanner: () => {},
    onOpenPlayerId: () => {},
    onShare: () => {},
    onCompare: () => {},
  },
} satisfies Meta<typeof PlayerIdentityCard>
export default meta
type Story = StoryObj<typeof meta>
export const Public: Story = {}
export const Unclaimed: Story = {
  args: {
    profile: {
      ...unclaimed,
      unclaimedSavedBy: clubs[1]?.name,
      leaderboardPlaces: profileLeaderboardStoryPlaces.slice(0, 2),
    },
    unclaimedFacts: { levelLabel: 'Intermediate Low', year: 2026, games: 32, wins: 24 },
  },
}
export const Initials: Story = { args: { profile: initials } }
export const OwnIdentity: Story = { args: { isOwn: true } }
export const LongNameAndNickname: Story = { args: { profile: playerProfileScenarios.longNames } }
export const OwnPhone: Story = {
  args: { isOwn: true },
  globals: { viewport: { value: 'phone' } },
}

export const PublicSignedIn: Story = { args: { compareSignedIn: true } }
export const OwnLight: Story = { args: { isOwn: true }, globals: { theme: 'light' } }
export const DuskBanner: Story = { args: { bannerKey: 'dusk' } }
export const SunBannerLight: Story = { args: { bannerKey: 'sun' }, globals: { theme: 'light' } }
