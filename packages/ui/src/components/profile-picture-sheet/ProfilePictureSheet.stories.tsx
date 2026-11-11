import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { mockPhotoReference, preparePlayerPhoto } from '@rotra/data/player/photo'
import { profileCharacterUrl } from '@rotra/ui/profile-picture'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ProfilePictureSheet, type ProfilePictureSheetProps } from './ProfilePictureSheet'

// 36 characters: three pages of 15, the last with 6.
const characters = ['', ...'abcdefghijklmnopqrstuvwxyz012345678'].map((id) => ({
  id,
  image: profileCharacterUrl('u1', 'Miguel Santos', id),
}))
const photo = playerProfiles.find((profile) => profile.fullName === 'Jose')?.picture ?? ''
const previousPhoto = characters[1]?.image ?? null

function Demo({
  initial,
  previous = null,
  isPending = false,
}: {
  initial: ProfilePictureSheetProps['picture']
  previous?: string | null
  isPending?: boolean
}) {
  const [open, setOpen] = useState(true)
  const [picture, setPicture] = useState(initial)
  const [previousPicture, setPreviousPicture] = useState(previous)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open profile picture
      </button>
      <ProfilePictureSheet
        open={open}
        onOpenChange={setOpen}
        playerId="u1"
        name="Jose"
        picture={picture}
        characters={characters}
        previousPhoto={previousPicture}
        isPending={isPending}
        preparePhoto={preparePlayerPhoto}
        onCommit={async () => {}}
        onCommitDraft={async (choice, previous) => {
          if (choice.kind === 'photo' && 'file' in choice) {
            setPicture({ kind: 'photo', src: await mockPhotoReference(choice.file, choice.crop) })
          } else setPicture(choice)
          setPreviousPicture(previous)
        }}
      />
    </>
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
    characters,
    preparePhoto: preparePlayerPhoto,
    onCommit: async () => {},
  },
} satisfies Meta<typeof ProfilePictureSheet>
export default meta
type Story = StoryObj<typeof meta>
export const Initials: Story = { render: () => <Demo initial={{ kind: 'initials' }} /> }
export const PreviousPicture: Story = {
  render: () => <Demo initial={{ kind: 'initials' }} previous={previousPhoto} />,
}
export const Photo: Story = {
  render: () => <Demo initial={{ kind: 'photo', src: photo }} previous={previousPhoto} />,
}
export const MiddlePage: Story = {
  render: () => <Demo initial={{ kind: 'character', id: 'q' }} previous={previousPhoto} />,
}
export const LastPage: Story = {
  render: () => <Demo initial={{ kind: 'character', id: '8' }} />,
}
export const PendingUpload: Story = {
  render: () => <Demo initial={{ kind: 'photo', src: photo }} previous={previousPhoto} />,
  parameters: {
    docs: {
      description: {
        story:
          'Choose Upload a photo to preview a pending upload; the previous picture row stays hidden until Done.',
      },
    },
  },
}
export const PendingSave: Story = {
  render: () => <Demo initial={{ kind: 'initials' }} isPending />,
}
export const SaveFailure: Story = {
  args: {
    onCommit: async () => {
      throw new Error("Couldn't save your picture. Try again.")
    },
  },
}
