import { adminAccessExamples } from '@rotra/data/fixtures/admin-accounts'
import { adminClubRows } from '@rotra/data/fixtures/admin-clubs'
import { contactChangeExamples } from '@rotra/data/fixtures/contact-change-requests'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChangeCompare } from './ChangeCompare'

const club = adminClubRows.find((row) => row.nameRequest)
if (!club?.nameRequest) throw new Error('Name change request fixture missing')

const meta = {
  title: 'Admin/ChangeCompare',
  component: ChangeCompare,
  args: { from: club.name, to: club.nameRequest, emphasis: 'bold' },
  argTypes: { emphasis: { control: 'inline-radio', options: ['bold', 'mono'] } },
} satisfies Meta<typeof ChangeCompare>

export default meta
type Story = StoryObj<typeof meta>

export const Name: Story = {}
export const NameInSheet: Story = { args: { toLabel: 'New' } }
export const Contact: Story = { args: { ...contactChangeExamples.email, emphasis: 'mono' } }
export const Phone: Story = { args: { ...contactChangeExamples.phone, emphasis: 'mono' } }
export const NotSet: Story = {
  args: { from: 'Not set', to: contactChangeExamples.notSet.to, emphasis: 'mono' },
}
export const LongValues: Story = {
  args: {
    from: contactChangeExamples.email.from,
    to: adminAccessExamples.longEmail,
    emphasis: 'mono',
  },
  globals: { viewport: { value: 'phone' } },
}
export const NamePhone: Story = { globals: { viewport: { value: 'phone' } } }
export const ContactPhone: Story = { ...Contact, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { ...Contact, globals: { viewport: { value: 'desktop' } } }
export const NameLight: Story = { globals: { theme: 'light' } }
export const ContactLight: Story = { ...Contact, globals: { theme: 'light' } }
