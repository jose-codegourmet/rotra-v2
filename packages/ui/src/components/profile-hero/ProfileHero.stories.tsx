import { playerProfileScenarios, playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { profileCharacterUrl } from '@rotra/ui/profile-picture'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ProfileHero } from './ProfileHero'

const photo = playerProfiles.find((p) => p.fullName === 'Jose')
const initials = playerProfiles.find((p) => p.fullName === 'Raymark')
if (!photo || !initials) throw new Error('Missing profile fixtures')

const meta = {
  title: 'Player/ProfileHero',
  component: ProfileHero,
  args: { name: photo.fullName, nickname: photo.nickname, pictureSrc: photo.picture },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-[360px]">
        <Card className="overflow-hidden pt-0">{Story()}</Card>
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileHero>
export default meta
type Story = StoryObj<typeof meta>

/** Someone else's profile: no pencil, no chip */
export const SomeoneElse: Story = {}
export const SomeoneElseLight: Story = { globals: { theme: 'light' } }
/** Your own profile: the pencils on the picture and the banner, and the This is you chip */
export const Own: Story = {
  args: {
    onChangePicture: fn(),
    onChangeBanner: fn(),
    badges: <Chip tone="accent">This is you</Chip>,
  },
}
/** The big picture opens the full photo (PhotoViewer, #716); initials stay inert */
export const ViewablePicture: Story = { args: { onViewPicture: fn() } }
export const OwnLight: Story = { ...Own, globals: { theme: 'light' } }
export const Character: Story = {
  args: {
    name: initials.fullName,
    nickname: initials.nickname,
    pictureSrc: profileCharacterUrl(initials.playerId, initials.fullName, 'c'),
  },
}
export const Initials: Story = {
  args: { name: initials.fullName, nickname: initials.nickname, pictureSrc: null },
}
export const LongName: Story = {
  args: {
    name: playerProfileScenarios.longNames.fullName,
    nickname: playerProfileScenarios.longNames.nickname,
    pictureSrc: playerProfileScenarios.longNames.picture,
  },
}
export const NightBanner: Story = { args: { bannerKey: 'night' } }
export const EmberBannerLight: Story = { args: { bannerKey: 'ember' }, globals: { theme: 'light' } }
export const StripeBanner: Story = { args: { bannerKey: 'stripe' } }
export const UploadedBanner: Story = {
  args: {
    bannerImageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400"><rect width="1000" height="400" fill="hsl(210 50% 45%)"/></svg>',
    )}`,
  },
}
/** Edit profile › Name preview: bold name, both pencils, helper line under it */
export const Preview: Story = {
  args: {
    placement: 'preview',
    onChangePicture: fn(),
    onChangeBanner: fn(),
    children: (
      <p className="m-0 text-xs text-fg2">
        This is how the top of your profile card looks. Tap a pencil to change your picture or
        banner.
      </p>
    ),
  },
  decorators: [(Story) => <div className="pt-4">{Story()}</div>],
}
export const PreviewLight: Story = { ...Preview, globals: { theme: 'light' } }
export const Phone: Story = { ...Own, globals: { viewport: { value: 'phone' } } }
