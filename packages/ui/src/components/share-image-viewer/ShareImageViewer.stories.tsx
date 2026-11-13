import { players } from '@rotra/data/fixtures/players'
import { ShareImage } from '@rotra/ui/share-image'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShareImageViewer } from './ShareImageViewer'

const player = players[3] ?? players[0]!
const image = (format: 'story' | 'post' | 'square') => (
  <ShareImage
    format={format}
    headline={player.fullName}
    subline={player.rtrId}
    spot={{ initials: 'MA' }}
  >
    <b data-qr-text className="text-[22px] font-extrabold text-share-accent">
      Intermediate High
    </b>
  </ShareImage>
)
const meta = {
  title: 'Shared/ShareImageViewer',
  component: ShareImageViewer,
  args: {
    open: true,
    onClose: () => {},
    onDownload: () => {},
    label: 'Facebook post',
    format: 'post',
    children: image('post'),
  },
} satisfies Meta<typeof ShareImageViewer>
export default meta
type Story = StoryObj<typeof meta>

export const FacebookPost: Story = { globals: { theme: 'dark' } }
export const FacebookPostLight: Story = { globals: { theme: 'light' } }
export const StoryPhone: Story = {
  args: { label: 'Story', format: 'story', children: image('story') },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
export const Square: Story = {
  args: { label: 'Square', format: 'square', children: image('square') },
  globals: { theme: 'light' },
}
