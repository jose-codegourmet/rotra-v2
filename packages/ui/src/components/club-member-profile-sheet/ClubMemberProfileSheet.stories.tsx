import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ClubMemberProfileSheet } from './ClubMemberProfileSheet'

const meta = {
  title: 'Player/ClubMemberProfileSheet',
  component: ClubMemberProfileSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    onOpenFullProfile: fn(),
    onShare: fn(),
    onViewPhoto: fn(),
    year: 2026,
    profileHref: '/players/p1',
    profile: {
      kind: 'public',
      name: 'Maria Steph',
      nickname: 'Atty Steph',
      levelLabel: 'Intermediate Low',
      position: 18,
      isYou: false,
      registeredCity: 'Cebu City',
      rtrId: 'RTR-PH-CEB-040226-0031',
      stats: { games: 24, wins: 15, losses: 9 },
    },
  },
} satisfies Meta<typeof ClubMemberProfileSheet>
export default meta
type Story = StoryObj<typeof meta>
export const Public: Story = {}
export const You: Story = {
  args: {
    profile: {
      kind: 'public',
      name: 'Jose',
      nickname: null,
      levelLabel: 'Intermediate Low',
      position: 7,
      isYou: true,
      registeredCity: 'Cebu City',
      rtrId: 'RTR-PH-CEB-040226-0001',
      stats: { games: 12, wins: 8, losses: 4 },
      bannerKey: 'dusk',
    },
  },
}
export const NoGames: Story = {
  args: {
    profile: {
      kind: 'public',
      name: 'Kenjie',
      nickname: null,
      levelLabel: null,
      position: null,
      isYou: false,
      registeredCity: null,
      rtrId: null,
      stats: { games: 0, wins: 0, losses: 0 },
      bannerKey: 'stripe',
    },
  },
}
export const Loading: Story = { args: { loading: true } }
export const Private: Story = {
  args: { profile: { kind: 'private', name: 'M*** S***', bannerKey: 'ember' } },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const PublicLight: Story = { globals: { theme: 'light' } }
export const PrivateLight: Story = { ...Private, globals: { theme: 'light' } }

export const UploadedBanner: Story = {
  args: {
    profile: {
      ...meta.args.profile,
      bannerKey: 'uploaded',
      bannerImageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400"><rect width="1000" height="400" fill="hsl(210 50% 45%)"/></svg>',
      )}`,
    },
  },
}
