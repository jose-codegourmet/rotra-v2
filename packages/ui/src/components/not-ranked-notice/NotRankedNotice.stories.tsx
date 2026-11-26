import type { Meta, StoryObj } from '@storybook/react-vite'
import { NotRankedNotice } from './NotRankedNotice'

const meta = {
  title: 'Queue/NotRankedNotice',
  component: NotRankedNotice,
} satisfies Meta<typeof NotRankedNotice>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Light: Story = { globals: { theme: 'light' } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }

export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
