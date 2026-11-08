import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ProfilePictureSheet, type ProfilePicture } from './ProfilePictureSheet'

function Demo({ initial }: { initial: ProfilePicture }) {
  const [open, setOpen] = useState(true)
  const [picture, setPicture] = useState(initial)
  return (
    <ProfilePictureSheet
      open={open}
      onOpenChange={setOpen}
      playerId="u1"
      name="Jose"
      picture={picture}
      onUpload={(file) => {
        const reader = new FileReader()
        reader.onload = () => setPicture({ kind: 'photo', src: String(reader.result) })
        reader.readAsDataURL(file)
      }}
      onUseInitials={() => setPicture({ kind: 'initials' })}
      onSelectCharacter={(id) => setPicture({ kind: 'character', id })}
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
    onUpload: () => {},
    onUseInitials: () => {},
    onSelectCharacter: () => {},
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
