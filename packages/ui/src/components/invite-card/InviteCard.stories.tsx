import type { Meta, StoryObj } from '@storybook/react-vite'
import { InviteCard, type InviteCardProps } from './InviteCard'

const meta = {
  title: 'Player/InviteCard',
  component: InviteCard,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-[min(480px,100vw-32px)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta
export default meta
// InviteCard's props are a union on `variant`, which Storybook's args typing collapses to never, so
// each story renders the card itself.
type Story = StoryObj

const startsAt = new Date(2026, 10, 19, 19, 0).getTime()

export const Club: Story = {
  render: () => (
    <InviteCard
      {...({
        variant: 'club',
        clubName: 'Lakeside Smashers',
        city: 'Cebu City',
        memberCount: 42,
      } satisfies InviteCardProps)}
    />
  ),
}
export const SessionWithInviter: Story = {
  render: () => (
    <InviteCard
      {...({
        variant: 'session',
        sessionTitle: 'Thursday open play',
        clubName: 'Lakeside Smashers',
        startsAt,
        when: 'Thu, Nov 19 · 7:00 PM',
        inviter: { name: 'Migs Santos', shortName: 'Migs' },
      } satisfies InviteCardProps)}
    />
  ),
}
export const SessionWithoutInviter: Story = {
  render: () => (
    <InviteCard
      {...({
        variant: 'session',
        sessionTitle: 'Thursday open play',
        clubName: 'Lakeside Smashers',
        startsAt,
        when: 'Thu, Nov 19 · 7:00 PM',
      } satisfies InviteCardProps)}
    />
  ),
}
export const Admin: Story = {
  render: () => <InviteCard {...({ variant: 'admin' } satisfies InviteCardProps)} />,
}
export const LongClubName: Story = {
  render: () => (
    <InviteCard
      {...({
        variant: 'club',
        clubName: 'The Very Long Named Badminton Association of Greater Metro Cebu',
        city: 'Cebu City',
        memberCount: 1,
      } satisfies InviteCardProps)}
    />
  ),
}
export const ClubLight: Story = { ...Club, globals: { theme: 'light' } }
export const SessionWithInviterLight: Story = {
  ...SessionWithInviter,
  globals: { theme: 'light' },
}
export const SessionWithoutInviterLight: Story = {
  ...SessionWithoutInviter,
  globals: { theme: 'light' },
}
export const AdminLight: Story = { ...Admin, globals: { theme: 'light' } }
export const Phone: Story = { ...SessionWithInviter, globals: { viewport: { value: 'phone' } } }
