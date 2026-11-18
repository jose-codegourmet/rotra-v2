import type { Meta, StoryObj } from '@storybook/react-vite'
import { InviteCard } from './InviteCard'

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
} satisfies Meta<typeof InviteCard>
export default meta
type Story = StoryObj<typeof meta>

const startsAt = new Date(2026, 10, 19, 19, 0).getTime()

export const Club: Story = {
  args: { variant: 'club', clubName: 'Lakeside Smashers', city: 'Cebu City', memberCount: 42 },
}
export const SessionWithInviter: Story = {
  args: {
    variant: 'session',
    sessionTitle: 'Thursday open play',
    clubName: 'Lakeside Smashers',
    startsAt,
    when: 'Thu, Nov 19 · 7:00 PM',
    inviter: { name: 'Migs Santos', shortName: 'Migs' },
  },
}
export const SessionWithoutInviter: Story = {
  args: {
    variant: 'session',
    sessionTitle: 'Thursday open play',
    clubName: 'Lakeside Smashers',
    startsAt,
    when: 'Thu, Nov 19 · 7:00 PM',
  },
}
export const Admin: Story = { args: { variant: 'admin' } }
export const LongClubName: Story = {
  args: {
    variant: 'club',
    clubName: 'The Very Long Named Badminton Association of Greater Metro Cebu',
    city: 'Cebu City',
    memberCount: 1,
  },
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
