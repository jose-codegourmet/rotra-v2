import type { Meta, StoryObj } from '@storybook/react-vite'
import { ContactVerificationNote } from './ContactVerificationNote'

const meta = {
  title: 'Admin/ContactVerificationNote',
  component: ContactVerificationNote,
  decorators: [(Story) => <div className="mx-auto max-w-[640px]">{Story()}</div>],
} satisfies Meta<typeof ContactVerificationNote>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { globals: { theme: 'light' } }
