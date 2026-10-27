import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from './Avatar'

const SIZES = [24, 28, 36, 40, 44, 52, 64, 88] as const

const meta = {
  title: 'Shared/Avatar',
  component: Avatar,
  args: { name: 'Miguel Santos' },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Initials: Story = {}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-3">
      {SIZES.map((size) => (
        <Avatar key={size} name="Bea Castillo" size={size} />
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
  args: { name: 'Jomar dela Cruz', size: 40, onClick: () => {} },
}

export const WithPicture: Story = {
  args: {
    name: 'Kat Lim',
    size: 52,
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64"/></svg>',
  },
}

export const LongName: Story = {
  args: { name: 'Jomar dela Cruz Bautista Villareal' },
}
