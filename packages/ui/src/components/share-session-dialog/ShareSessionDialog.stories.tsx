import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ShareSessionDialog } from './ShareSessionDialog'

const meta = {
  title: 'Queue/ShareSessionDialog',
  component: ShareSessionDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    link: 'https://rotra.app/s/sunday-night',
    onSharePhotos: fn(),
    onCopyLink: fn(),
    onFacebookPost: fn(),
  },
} satisfies Meta<typeof ShareSessionDialog>

export default meta
type Story = StoryObj<typeof meta>

/** Exactly three tiles: Share photos, Share the link, Facebook post. */
export const Default: Story = { globals: { theme: 'dark' } }
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { theme: 'light', viewport: { value: 'phone' } } }
