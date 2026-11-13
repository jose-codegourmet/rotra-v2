import { players } from '@rotra/data/fixtures/players'
import { SegmentedControl } from '@rotra/ui/segmented-control'
import { SHARE_FORMATS } from '@rotra/ui/share-card/helpers'
import { ShareDialog } from '@rotra/ui/share-dialog'
import { ShareImage } from '@rotra/ui/share-image'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShareImagePicker } from './ShareImagePicker'

const player = players[3] ?? players[0]!
const items = SHARE_FORMATS.map(({ format, label, hint }) => ({
  id: format,
  label,
  hint,
  format,
  fileName: `rotra-profile-${format}`,
  image: (
    <ShareImage
      format={format}
      headline={player.fullName}
      subline={player.rtrId}
      spot={{ initials: 'MA' }}
    >
      <div className="flex flex-1 flex-col justify-center gap-2">
        <b data-qr-text className="text-[22px] font-extrabold text-share-accent">
          Intermediate High
        </b>
        <b data-qr-text className="font-mono text-[36px] leading-none text-share-accent">
          #214
        </b>
      </div>
    </ShareImage>
  ),
}))
const meta = {
  title: 'Shared/ShareImagePicker',
  component: ShareImagePicker,
  args: {
    items,
    shareTitle: 'Share profile',
    link: `https://player.rotra.example/players/${player.id}`,
    linkLabel: 'Profile link',
    copyLabel: 'Copy profile link',
    onCopy: () => {},
    webShare: false,
  },
  decorators: [
    (Story) => (
      <ShareDialog open onOpenChange={() => {}} title="Share profile">
        <Story />
      </ShareDialog>
    ),
  ],
} satisfies Meta<typeof ShareImagePicker>
export default meta
type Story = StoryObj<typeof meta>

export const AllPicked: Story = { globals: { theme: 'dark' } }
export const AllPickedLight: Story = { globals: { theme: 'light' } }
export const SomePicked: Story = { args: { initialPicked: ['post'] }, globals: { theme: 'dark' } }
export const NonePicked: Story = { args: { initialPicked: [] }, globals: { theme: 'dark' } }
export const NonePickedLight: Story = { args: { initialPicked: [] }, globals: { theme: 'light' } }
export const WithShare: Story = { args: { webShare: true }, globals: { theme: 'dark' } }
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { theme: 'light', viewport: { value: 'phone' } } }
/** Share leaderboard: its size switch on the left, pages as images. */
export const Toolbar: Story = {
  args: {
    countUnit: { one: 'image', other: 'images' },
    toolbar: (
      <SegmentedControl
        aria-label="Image size"
        options={SHARE_FORMATS.map(({ format, label }) => ({ value: format, label }))}
        value="post"
        onChange={() => {}}
      />
    ),
    items: items.map((item, index) => ({
      ...item,
      id: String(index),
      label: `Image ${index + 1}`,
      hint: `#${index * 8 + 1}–${index * 8 + 8}`,
      format: 'post' as const,
    })),
  },
  globals: { theme: 'dark' },
}
export const NoLink: Story = {
  args: { link: undefined, onCopy: undefined },
  globals: { theme: 'dark' },
}
