import { adminAccount, adminAccessExamples } from '@rotra/data/fixtures/admin-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminSignInForm } from './AdminSignInForm'

const meta = { title: 'Admin/AdminSignInForm', component: AdminSignInForm, args: { onSubmit: () => {} } } satisfies Meta<typeof AdminSignInForm>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Pending: Story = { args: { isPending: true } }
export const ServerError: Story = { args: { serverError: adminAccessExamples.credentialError, defaultValues: { email: adminAccount.email } } }
export const SessionEnded: Story = { args: { sessionEnded: true } }
export const FieldErrors: Story = { play: async ({ canvasElement }) => { canvasElement.querySelector<HTMLButtonElement>('button[type="submit"]')?.click() } }
export const LongEmail: Story = { args: { defaultValues: { email: adminAccessExamples.longEmail } } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
