import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PublicPreviewBanner } from './PublicPreviewBanner'

const meta = {
  title: 'Queue/PublicSession/PublicPreviewBanner',
  component: PublicPreviewBanner,
  parameters: { layout: 'fullscreen' },
  args: { onBack: fn() },
} satisfies Meta<typeof PublicPreviewBanner>

export default meta
type Story = StoryObj<typeof meta>

export const Banner: Story = {}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
