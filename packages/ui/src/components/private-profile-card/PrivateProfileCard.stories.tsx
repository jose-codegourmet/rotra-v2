import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { maskPublicName } from '@rotra/data/public-session/rules'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PrivateProfileCard } from './PrivateProfileCard'

const alwaysPrivate =
  playerProfiles.find((p) => p.profileVisibility === 'always_private') ?? playerProfiles[0]

const meta = {
  title: 'Queue/PublicSession/PrivateProfileCard',
  component: PrivateProfileCard,
  args: {
    open: true,
    onOpenChange: fn(),
    variant: 'private',
    name: maskPublicName(alwaysPrivate?.fullName ?? 'Albion'),
    photoUrl: alwaysPrivate?.picture ?? undefined,
    onPhotoClick: fn(),
  },
} satisfies Meta<typeof PrivateProfileCard>

export default meta
type Story = StoryObj<typeof meta>

/** All stories support both themes through the Theme toolbar. */
export const AlwaysPrivate: Story = {}
export const AlwaysPrivateInitials: Story = { args: { photoUrl: undefined } }
export const Guest: Story = {
  args: { variant: 'guest', name: maskPublicName('Yna Guest'), photoUrl: undefined },
}
export const PrivateLight: Story = { globals: { theme: 'light' } }
export const GuestLight: Story = {
  args: { variant: 'guest', name: maskPublicName('Yna Guest'), photoUrl: undefined },
  globals: { theme: 'light' },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
