import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { type ProfileVisibility, ProfileVisibilityControl } from './ProfileVisibilityControl'

const meta = {
  title: 'Player/ProfileVisibilityControl',
  component: ProfileVisibilityControl,
  args: { savedVisibility: 'private', onChange: fn() },
  decorators: [(Story) => <div className="mx-auto max-w-[560px]">{Story()}</div>],
} satisfies Meta<typeof ProfileVisibilityControl>
export default meta
type Story = StoryObj<typeof meta>

export const Public: Story = { args: { savedVisibility: 'public' } }
export const PublicLight: Story = {
  args: { savedVisibility: 'public' },
  globals: { theme: 'light' },
}
export const Private: Story = {}
export const PrivateLight: Story = { globals: { theme: 'light' } }
export const AlwaysPrivate: Story = { args: { savedVisibility: 'always_private' } }
export const AlwaysPrivateLight: Story = {
  args: { savedVisibility: 'always_private' },
  globals: { theme: 'light' },
}
export const Saving: Story = { args: { isPending: true } }
export const SavingLight: Story = { args: { isPending: true }, globals: { theme: 'light' } }
export const OfflineError: Story = {
  args: { error: "Couldn't save because you're offline. Your profile is still private." },
}
export const OfflineErrorLight: Story = { ...OfflineError, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Interactive: Story = {
  render: () => {
    const [saved, setSaved] = useState<ProfileVisibility>('private')
    return <ProfileVisibilityControl savedVisibility={saved} onChange={setSaved} />
  },
}
