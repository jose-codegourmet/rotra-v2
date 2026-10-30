import { adminPlayerDetailExamples, adminPlayerScenarios } from '@rotra/data/fixtures/admin-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CurrentContactsCard } from './CurrentContactsCard'

const { jose } = adminPlayerScenarios
const { contact } = adminPlayerDetailExamples

const meta = {
  title: 'Admin/CurrentContactsCard',
  component: CurrentContactsCard,
  args: {
    fullName: jose.fullName,
    rtrId: jose.rtrId,
    onOpenPlayer: fn(),
    claimed: true,
    phone: contact.hidden.phone,
    email: contact.hidden.email,
  },
  decorators: [(Story) => <div className="mx-auto max-w-[420px]">{Story()}</div>],
} satisfies Meta<typeof CurrentContactsCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
/** The player detail route isn't wired here; the href is a placeholder anchor. */
export const AsLink: Story = { args: { href: `#${jose.id}`, onOpenPlayer: undefined } }
/** Story-only: every demo player is registered. The club typed the phone; no email yet. */
export const Unclaimed: Story = { args: { claimed: false, email: contact.unclaimed.email } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }
