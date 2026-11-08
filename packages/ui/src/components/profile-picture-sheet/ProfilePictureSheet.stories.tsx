import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { mockPhotoReference, preparePlayerPhoto } from '@rotra/data/player/photo'
import type { ProfilePicture } from '@rotra/ui/profile-picture'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ProfilePictureSheet } from './ProfilePictureSheet'

function Demo({ initial, isPending = false }: { initial: ProfilePicture; isPending?: boolean }) {
  const [open, setOpen] = useState(true)
  const [picture, setPicture] = useState(initial)
  return (
    <ProfilePictureSheet
      open={open}
      onOpenChange={setOpen}
      playerId="u1"
      name="Jose"
      picture={picture}
      isPending={isPending}
      preparePhoto={preparePlayerPhoto}
      onCommit={async (choice) => {
        if (choice.kind === 'photo')
          setPicture({ kind: 'photo', src: await mockPhotoReference(choice.file, choice.crop) })
        else setPicture(choice)
      }}
    />
  )
}
const meta = {
  title: 'Player/ProfilePictureSheet',
  component: ProfilePictureSheet,
  args: {
    open: true,
    onOpenChange: () => {},
    playerId: 'u1',
    name: 'Jose',
    picture: { kind: 'initials' },
    preparePhoto: preparePlayerPhoto,
    onCommit: async () => {},
  },
} satisfies Meta<typeof ProfilePictureSheet>
export default meta
type Story = StoryObj<typeof meta>
export const Initials: Story = { render: () => <Demo initial={{ kind: 'initials' }} /> }
export const Character: Story = { render: () => <Demo initial={{ kind: 'character', id: 'a' }} /> }
export const Photo: Story = {
  render: () => (
    <Demo
      initial={{
        kind: 'photo',
        src: playerProfiles.find((profile) => profile.fullName === 'Jose')?.picture ?? '',
      }}
    />
  ),
}
export const Phone: Story = {
  render: () => <Demo initial={{ kind: 'character', id: '' }} />,
  globals: { viewport: { value: 'phone' } },
}

export const Pending: Story = {
  render: () => <Demo initial={{ kind: 'character', id: 'a' }} isPending />,
}

export const SaveFailure: Story = {
  args: {
    onCommit: async () => {
      throw new Error("Couldn't save your picture. Try again.")
    },
  },
}

export const ReducedMotion: Story = {
  render: () => <Demo initial={{ kind: 'initials' }} />,
  parameters: {
    docs: {
      description: {
        story:
          'Select an animated GIF, drag and zoom it, then emulate prefers-reduced-motion: reduce: the crop preview freezes while the stored GIF keeps every frame.',
      },
    },
  },
}
