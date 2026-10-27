import { facebookPostFixtures } from '@rotra/data/fixtures/facebookPost'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PostPreviewSheet } from './PostPreviewSheet'

const dateLabel = new Date(facebookPostFixtures.sessionStartsAt).toLocaleDateString([], {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const meta = {
  title: 'Queue/PostPreviewSheet',
  component: PostPreviewSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    sessionTitle: facebookPostFixtures.sessionTitle,
    dateLabel,
    text: facebookPostFixtures.filledDefault,
  },
} satisfies Meta<typeof PostPreviewSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Saved: Story = {}
export const IncludesUnsaved: Story = {
  args: { includesUnsaved: true, text: facebookPostFixtures.filledCustom },
}
export const UnknownKey: Story = { args: { text: facebookPostFixtures.filledUnknownKey } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
