import { adminAccessExamples } from '@rotra/data/fixtures/admin-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AccessDeniedCard } from './AccessDeniedCard'

const meta = { title: 'Admin/AccessDeniedCard', component: AccessDeniedCard, args: { accountDescription: adminAccessExamples.deniedDescription, onSignOut: () => {} } } satisfies Meta<typeof AccessDeniedCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const SigningOut: Story = { args: { isSigningOut: true } }
export const LongAccountDescription: Story = { args: { accountDescription: adminAccessExamples.longAccountDescription } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
