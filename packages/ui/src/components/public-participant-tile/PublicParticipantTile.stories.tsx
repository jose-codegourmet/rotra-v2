import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
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
/** Signed-in viewer (#731): a button named “NAME · view profile”; hover and focus ring the picture. */
export const OpensProfile: Story = {
  args: { name: 'Mikee Abellana', nickname: 'Mik', masked: false, onOpen: fn() },
}
/** Masked tiles open too (always-private and guest cards); the nickname stays hidden. */
export const MaskedOpensCard: Story = {
  args: { nickname: 'Mik', onOpen: fn() },
}
export const You: Story = {
  args: {
    name: 'Mikee Abellana',
    nickname: 'Mik',
    masked: false,
    isViewer: true,
    onOpen: fn(),
  },
}
export const WaitlistBadge: Story = {
  args: {
    name: 'Mikee Abellana',
    masked: false,
    onOpen: fn(),
    waitlistPosition: 3,
  },
}
export const WaitlistYou: Story = {
  args: {
    name: 'Mikee Abellana',
    masked: false,
    isViewer: true,
    onOpen: fn(),
    waitlistPosition: 3,
  },
}
export const LongNames: Story = {
  args: {
    name: 'Maria Cristina Bautista Villareal de los Reyes',
    nickname: 'Mariacristinabautistavillarealdelosreyes',
    masked: false,
    onOpen: fn(),
  },
}
export const Light: Story = {
  args: { name: 'Mikee Abellana', masked: false, isViewer: true, onOpen: fn() },
  globals: { theme: 'light' },
}
