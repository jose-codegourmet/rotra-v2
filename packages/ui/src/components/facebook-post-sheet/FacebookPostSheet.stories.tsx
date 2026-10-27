import { facebookPostFixtures } from '@rotra/data/fixtures/facebookPost'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { FacebookPostSheet } from './FacebookPostSheet'

const meta = {
  title: 'Queue/FacebookPostSheet',
  component: FacebookPostSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    sessionTitle: facebookPostFixtures.sessionTitle,
    text: facebookPostFixtures.filledDefault,
    playerCount: facebookPostFixtures.playerCount,
    onEditTemplate: fn(),
    onCopy: fn(),
  },
} satisfies Meta<typeof FacebookPostSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const CustomTemplate: Story = { args: { text: facebookPostFixtures.filledCustom } }
export const EmptyRoster: Story = {
  args: { text: facebookPostFixtures.filledEmptyRoster, playerCount: 0 },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
