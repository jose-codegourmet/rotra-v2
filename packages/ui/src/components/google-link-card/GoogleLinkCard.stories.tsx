import type { Meta, StoryObj } from '@storybook/react-vite'
import { GoogleLinkCard } from './GoogleLinkCard'

const meta = {
  title: 'Player/GoogleLinkCard',
  component: GoogleLinkCard,
  args: {
    player: { name: 'Dalton Reyes', rtrId: 'RTR-3318' },
    google: { name: 'Dalton', email: 'dalton@example.com' },
    onConnect: () => {},
    onUsePassword: () => {},
  },
} satisfies Meta<typeof GoogleLinkCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Pending: Story = { args: { isPending: true } }
export const LongNames: Story = {
  args: {
    player: { name: 'Maria Cristina Dela Cruz-Villanueva', rtrId: 'RTR-2001' },
    google: {
      name: 'Maria Cristina',
      email: 'maria.cristina.dela.cruz.villanueva.plays@example.com',
    },
  },
}
export const DefaultLight: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
