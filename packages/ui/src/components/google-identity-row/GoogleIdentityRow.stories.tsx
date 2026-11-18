import type { Meta, StoryObj } from '@storybook/react-vite'
import { GoogleIdentityRow } from './GoogleIdentityRow'

const meta = {
  title: 'Player/GoogleIdentityRow',
  component: GoogleIdentityRow,
  args: { name: 'Migs Santos', email: 'migs.santos@gmail.com' },
  decorators: [
    (Story) => (
      <div className="w-[min(420px,100vw-32px)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GoogleIdentityRow>
export default meta
type Story = StoryObj<typeof meta>
export const EmailConfirmed: Story = { args: { chip: 'confirmed' } }
export const SameEmail: Story = { args: { chip: 'same-email' } }
export const WithHelper: Story = {
  args: { chip: 'confirmed', helper: 'This is the email your ROTRA account will use.' },
}
export const LongEmail: Story = {
  args: {
    chip: 'same-email',
    email: 'a.very.long.email.address.for.the.google.identity.row@example.com',
  },
}
export const EmailConfirmedLight: Story = { ...EmailConfirmed, globals: { theme: 'light' } }
export const SameEmailLight: Story = { ...SameEmail, globals: { theme: 'light' } }
export const Phone: Story = { ...EmailConfirmed, globals: { viewport: { value: 'phone' } } }
