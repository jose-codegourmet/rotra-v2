import { adminPlayerScenarios } from '@rotra/data/fixtures/admin-players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ApprovalScopeCard } from './ApprovalScopeCard'

const { jose } = adminPlayerScenarios

const meta = {
  title: 'Admin/ApprovalScopeCard',
  component: ApprovalScopeCard,
  args: { field: 'phone', firstName: jose.fullName },
  decorators: [(Story) => <div className="mx-auto max-w-[420px]">{Story()}</div>],
} satisfies Meta<typeof ApprovalScopeCard>

export default meta
type Story = StoryObj<typeof meta>

export const Phone: Story = {}
export const Email: Story = { args: { field: 'email' } }
export const PhoneViewport: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }
