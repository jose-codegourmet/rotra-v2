import type { Meta, StoryObj } from '@storybook/react-vite'
import { GoogleRequiredCard } from './GoogleRequiredCard'

const meta = {
  title: 'Player/GoogleRequiredCard',
  component: GoogleRequiredCard,
  args: {
    player: { name: 'Jose Buctuanon', email: 'jose@example.com' },
    deadlineLabel: 'December 31, 2026',
    onConnectTried: () => {},
    onChooseGoogle: () => {},
    onNoGoogle: () => {},
    onSignOut: () => {},
  },
} satisfies Meta<typeof GoogleRequiredCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const WithTriedEmail: Story = { args: { triedEmail: 'jose.plays@gmail.com' } }
export const Pending: Story = { args: { pending: true } }
export const LongEmail: Story = {
  args: {
    triedEmail: 'a.very.long.email.address.for.the.required.card@example.com',
    player: {
      name: 'Maria Cristina Dela Cruz-Villanueva',
      email: 'maria.cristina.dela.cruz.villanueva@example.com',
    },
  },
}
export const DefaultLight: Story = { globals: { theme: 'light' } }
export const WithTriedEmailLight: Story = {
  args: { triedEmail: 'jose.plays@gmail.com' },
  globals: { theme: 'light' },
}
export const Phone: Story = {
  args: { triedEmail: 'jose.plays@gmail.com' },
  globals: { viewport: { value: 'phone' } },
}
