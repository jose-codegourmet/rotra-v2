import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ShareSessionDialog } from './ShareSessionDialog'

const longPost = [
  'Sunday Night Smashers - Sunday, Nov 29',
  '7:00-10:00 PM at Hall A, 3 courts',
  '',
  ...Array.from({ length: 24 }, (_, i) => `${i + 1}. Player ${i + 1}`),
  '',
  'Join: https://rotra.app/s/sunday-night',
].join('\n')
const liveCard = {
  slug: 'sunday-night',
  clubName: 'Sunday Night Smashers',
  clubInitials: 'SN',
  sessionTitle: 'Sunday Night Smashers',
  dateLabel: 'Sun, Nov 29',
  timeLabel: '7:00 PM–10:00 PM',
  venueName: 'Hall A',
}

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
type Story = StoryObj<typeof ShareSessionDialog>

/** Exactly three tiles: Share photos, Share the link, Facebook post. */
export const Default: Story = { globals: { theme: 'dark' } }
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { theme: 'light', viewport: { value: 'phone' } } }

const liveArgs = {
  variant: 'live' as const,
  postText: longPost,
  playerCount: 24,
  onCopyList: fn(),
  card: liveCard,
}
/** Live variant: Player list, Social post images, Invite link; footer Done. */
export const Live: Story = { args: liveArgs, globals: { theme: 'dark' } }
export const LiveLight: Story = { args: liveArgs, globals: { theme: 'light' } }
export const LiveStory: Story = {
  args: { ...liveArgs, initialFormat: 'story' },
  globals: { theme: 'dark' },
}
export const LiveStoryLight: Story = {
  args: { ...liveArgs, initialFormat: 'story' },
  globals: { theme: 'light' },
}
export const LivePhone: Story = {
  args: liveArgs,
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
export const LivePhoneLight: Story = {
  args: liveArgs,
  globals: { theme: 'light', viewport: { value: 'phone' } },
}
export const LiveLoading: Story = {
  args: { ...liveArgs, loading: true },
  globals: { theme: 'dark' },
}
export const LiveError: Story = {
  args: { ...liveArgs, error: "Couldn't fill in the post. Try again.", onRetry: fn() },
  globals: { theme: 'dark' },
}
export const LiveErrorLight: Story = {
  args: { ...liveArgs, error: "Couldn't fill in the post. Try again.", onRetry: fn() },
  globals: { theme: 'light' },
}
