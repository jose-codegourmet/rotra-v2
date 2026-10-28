import { playerAccounts } from '@rotra/data/fixtures/player-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ContactChangeRequestForm } from './ContactChangeRequestForm'

const migs = playerAccounts.find((account) => account.email === 'migs.santos@example.com')
if (!migs) throw new Error('Missing private account fixture')
const meta = {
  title: 'Player/ContactChangeRequestForm',
  component: ContactChangeRequestForm,
  args: {
    open: true,
    onOpenChange: fn(),
    currentPhone: migs.phone,
    currentEmail: migs.email,
    onSubmit: fn(),
  },
} satisfies Meta<typeof ContactChangeRequestForm>
export default meta
type Story = StoryObj<typeof meta>
export const Email: Story = {}
export const PhoneGrouped: Story = { args: { defaultValues: { field: 'phone', toValue: '0918 555 0377' } } }
export const ServerConflict: Story = {
  args: {
    defaultValues: { field: 'email', toValue: 'jom.reyes@example.com' },
    fieldError: 'That email belongs to another ROTRA profile. Contact ROTRA for help.',
  },
}
export const OfflineError: Story = {
  args: {
    defaultValues: { field: 'email', toValue: 'migs.new@example.com' },
    serverError: "Couldn't send because you're offline. Try again when you're connected.",
  },
}
export const Pending: Story = {
  args: { defaultValues: { field: 'email', toValue: 'migs.new@example.com' }, isPending: true },
}
export const OnPhone: Story = { globals: { viewport: { value: 'phone' } } }
