import { adminPlayerDetailExamples } from '@rotra/data/fixtures/admin-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerAccountCard } from './PlayerAccountCard'

const { account } = adminPlayerDetailExamples

const meta = {
  title: 'Admin/PlayerAccountCard',
  component: PlayerAccountCard,
  args: account.registered,
} satisfies Meta<typeof PlayerAccountCard>

export default meta
type Story = StoryObj<typeof meta>

export const Registered: Story = {}
export const Unclaimed: Story = { args: account.unclaimed }
export const Phone: Story = { args: account.unclaimed, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }
export const UnclaimedLight: Story = { args: account.unclaimed, globals: { theme: 'light' } }
