import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ClubPictureField } from './ClubPictureField'

const meta = {
  title: 'Queue/ClubPictureField',
  component: ClubPictureField,
  args: {
    playerId: 'p-kevin',
    name: 'Kevin Louie',
    picture: { kind: 'initials', reference: null, characterId: null, previousSrc: null },
    onChange: fn(),
    onRemove: fn(),
    onUsePrevious: fn(),
  },
} satisfies Meta<typeof ClubPictureField>

export default meta
type Story = StoryObj<typeof meta>

export const Initials: Story = {}

export const NewPlayer: Story = {
  args: {
    label: 'Profile picture (optional)',
    hint: 'Shown wherever this player appears in your club. When they claim their profile they can change it.',
  },
}

export const Pending: Story = { args: { pending: true } }

export const WithError: Story = { args: { error: 'That image could not be read' } }
