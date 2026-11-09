import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ClubInvitePanel } from './ClubInvitePanel'

const meta = {
  title: 'Queue/ClubInvitePanel',
  component: ClubInvitePanel,
  args: {
    link: 'https://rotra.app/register/lahug-smash',
    onCopyLink: fn(),
    onShareClubInvite: fn(),
    onRegenerate: fn(),
    onConfirmOpenChange: fn(),
  },
} satisfies Meta<typeof ClubInvitePanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const ConfirmOpen: Story = { args: { confirmOpen: true } }
export const Regenerated: Story = {
  args: { link: 'https://rotra.app/register/lahug-smash?k=k7m2p9qw' },
}
export const Phone: Story = {
  args: { link: 'https://rotra.app/register/lahug-smash?k=k7m2p9qw' },
  globals: { viewport: { value: 'phone' } },
}
export const PhoneConfirmOpen: Story = {
  args: { confirmOpen: true },
  globals: { viewport: { value: 'phone' } },
}
