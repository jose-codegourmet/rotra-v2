import { storyIdentityPlayers } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { InviteSheet } from './InviteSheet'

const { guest, unclaimed } = storyIdentityPlayers

// The prototype's sample link shape (rotra.example/join/<code>).
const meta = {
  title: 'Queue/InviteSheet',
  component: InviteSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    onCopy: fn(),
    name: guest.fullName,
    identity: 'guest',
    link: 'https://rotra.example/join/K7Q2M9X',
  },
} satisfies Meta<typeof InviteSheet>

export default meta
type Story = StoryObj<typeof meta>

export const InviteGuest: Story = {}
export const InviteUnclaimed: Story = { args: { name: unclaimed.fullName, identity: 'unclaimed' } }
export const Offline: Story = { args: { offline: true } }
export const LoadingLink: Story = { args: { link: undefined } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
