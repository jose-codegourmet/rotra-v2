import type { Meta, StoryObj } from '@storybook/react-vite'
import { PublicParticipantTile } from './PublicParticipantTile'

const meta = {
  title: 'Queue/PublicSession/PublicParticipantTile',
  component: PublicParticipantTile,
  decorators: [
    (Story) => (
      <div className="w-[110px] pt-2">
        <Story />
      </div>
    ),
  ],
  args: { name: 'M*** A***', masked: true, skillGroup: 'intermediate', levelLabel: 'Intermediate' },
} satisfies Meta<typeof PublicParticipantTile>

export default meta
type Story = StoryObj<typeof meta>

/** All stories support both themes through the Theme toolbar. */
export const Plain: Story = {}
export const Nickname: Story = {
  args: { name: 'Mikee Abellana', nickname: 'Mik', masked: false },
}
export const Linked: Story = {
  args: { name: 'Mikee Abellana', nickname: 'Mik', masked: false, href: '/player/find/RTR-00123' },
}
export const MaskedIgnoresLink: Story = {
  args: { href: '/player/find/RTR-00123', nickname: 'Mik' },
}
export const You: Story = {
  args: {
    name: 'Mikee Abellana',
    nickname: 'Mik',
    masked: false,
    isViewer: true,
    href: '/player/find/RTR-00123',
  },
}
export const WaitlistBadge: Story = {
  args: {
    name: 'Mikee Abellana',
    masked: false,
    href: '/player/find/RTR-00123',
    waitlistPosition: 3,
  },
}
export const WaitlistYou: Story = {
  args: {
    name: 'Mikee Abellana',
    masked: false,
    isViewer: true,
    href: '/player/find/RTR-00123',
    waitlistPosition: 3,
  },
}
export const LongNames: Story = {
  args: {
    name: 'Maria Cristina Bautista Villareal de los Reyes',
    nickname: 'Mariacristinabautistavillarealdelosreyes',
    masked: false,
    href: '/player/find/RTR-00123',
  },
}
export const Light: Story = {
  args: { name: 'Mikee Abellana', masked: false, isViewer: true, href: '/player/find/RTR-00123' },
  globals: { theme: 'light' },
}
