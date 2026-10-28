import { adminAccount, adminAccessExamples } from '@rotra/data/fixtures/admin-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminAccountBadge } from './AdminAccountBadge'
const meta = { title: 'Admin/AdminAccountBadge', component: AdminAccountBadge, args: { email: adminAccount.email } } satisfies Meta<typeof AdminAccountBadge>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Narrow: Story = { globals: { viewport: { value: 'phone' } } }
export const LongEmail: Story = { args: { email: adminAccessExamples.longEmail } }
