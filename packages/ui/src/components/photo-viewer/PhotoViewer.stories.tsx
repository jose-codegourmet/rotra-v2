import { playerProfiles } from '@rotra/data/fixtures/player-profiles'
import { Avatar } from '@rotra/ui/avatar'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { Sheet } from '@rotra/ui/sheet'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MotionConfig } from 'motion/react'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { PhotoViewer } from './PhotoViewer'

const withPhoto = playerProfiles.find((p) => p.picture)
const photoName = withPhoto?.fullName ?? 'Aaron'
const characterSrc = profilePictureSrc('character:a', 'player-mikee', 'Mikee Abellana') ?? ''
const photoSrc = withPhoto?.picture ?? characterSrc

const meta = {
  title: 'Shared/PhotoViewer',
  component: PhotoViewer,
  args: { open: true, onClose: fn(), src: photoSrc, name: photoName },
} satisfies Meta<typeof PhotoViewer>

export default meta
type Story = StoryObj<typeof meta>

/** An uploaded photo, open. */
export const Photo: Story = {}

/** A chosen character picture. */
export const Character: Story = {
  args: { src: characterSrc, name: 'Mikee Abellana' },
}

/** The dialog name carries the whole name; nothing visible changes. */
export const LongName: Story = {
  args: { name: 'Raymark Bautista Villareal de los Santos Jr.' },
}

/** Reduced motion: the overlay and photo appear without a fade. */
export const ReducedMotion: Story = {
  decorators: [
    (Story) => (
      <MotionConfig reducedMotion="always">
        <Story />
      </MotionConfig>
    ),
  ],
}

/** Opened from an Avatar: overlay tap, × or Esc close it and focus returns to the avatar. */
export const FromAvatar: Story = {
  args: { open: false },
  render: () => {
    const photo = usePhotoViewer()
    return (
      <>
        <Avatar
          name={photoName}
          src={photoSrc}
          size={64}
          onView={() => photo.show({ src: photoSrc, name: photoName })}
        />
        {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
      </>
    )
  },
}

/** Over a profile sheet: Esc closes only the viewer and returns to the big photo in the sheet. */
export const OverSheet: Story = {
  args: { open: false },
  render: () => {
    const [sheet, setSheet] = useState(true)
    const photo = usePhotoViewer()
    return (
      <Sheet open={sheet} onOpenChange={setSheet} title={photoName}>
        <Avatar
          name={photoName}
          src={photoSrc}
          size={64}
          onView={() => photo.show({ src: photoSrc, name: photoName })}
        />
        {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
      </Sheet>
    )
  },
}
