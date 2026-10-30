import { adminPlayerDetailExamples } from '@rotra/data/fixtures/admin-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PrivateContactCard } from './PrivateContactCard'

const { contact } = adminPlayerDetailExamples

const meta = {
  title: 'Admin/PrivateContactCard',
  component: PrivateContactCard,
  args: contact.registered,
} satisfies Meta<typeof PrivateContactCard>

export default meta
type Story = StoryObj<typeof meta>

export const Registered: Story = {}
export const Hidden: Story = { args: contact.hidden }
/** The club typed the phone; no email and no sign-in yet. */
export const Unclaimed: Story = { args: contact.unclaimed }
export const Phone: Story = { args: contact.hidden, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { args: contact.hidden, globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }
export const UnclaimedLight: Story = { args: contact.unclaimed, globals: { theme: 'light' } }
