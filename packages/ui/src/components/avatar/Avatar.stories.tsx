import { Button } from '@rotra/ui/button'
import { profilePictureSrc } from '@rotra/ui/profile-picture'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Avatar } from './Avatar'

const SIZES = [24, 28, 36, 40, 44, 52, 64, 88] as const

const meta = {
  title: 'Shared/Avatar',
  component: Avatar,
  args: { name: 'Jose' },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Initials: Story = {}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-3">
      {SIZES.map((size) => (
        <Avatar key={size} name="Aaron" size={size} />
      ))}
    </div>
  ),
}

export const ClubTile: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      <Avatar name="Lahug Smash Club" size={52} shape="square" tone="accent" />
      <Avatar name="Lahug Smash Club" size={88} shape="square" tone="accent" />
    </div>
  ),
}

export const Clickable: Story = {
  args: { name: 'Raymark', size: 40, onClick: () => {} },
}

export const WithPicture: Story = {
  args: {
    name: 'Mikee Abellana',
    size: 52,
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64"/></svg>',
  },
}

export const LongName: Story = {
  args: { name: 'Raymark Bautista Villareal' },
}

/** An unreadable image falls back to the same player's initials. */
export const FailedPicture: Story = {
  args: { name: 'Mikee Abellana', src: 'data:image/png;base64,invalid' },
}

export const SavedCharacter: Story = {
  args: {
    src: profilePictureSrc('character:a', 'player-mikee', 'Mikee Abellana'),
    name: 'Mikee Abellana',
  },
}

/** Switch between a failed source and fresh identities, including under reduced motion. */
export const PictureChanges: Story = {
  render: () => {
    const [choice, setChoice] = useState(0)
    const name = choice === 2 ? 'Jose' : 'Mikee Abellana'
    const src =
      choice === 0
        ? 'data:image/png;base64,invalid'
        : profilePictureSrc('character:a', choice === 2 ? 'player-jose' : 'player-mikee', name)
    return (
      <div className="flex items-center gap-3">
        <Avatar name={name} src={src} size={52} />
        <Button onClick={() => setChoice((current) => (current + 1) % 3)}>Change picture</Button>
      </div>
    )
  },
}
