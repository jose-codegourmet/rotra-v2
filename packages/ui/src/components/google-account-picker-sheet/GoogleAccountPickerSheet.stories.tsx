import { googlePickerAccounts } from '@rotra/data/fixtures/google-sign-in'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { GoogleAccountPickerSheet } from './GoogleAccountPickerSheet'

const meta = {
  title: 'Player/GoogleAccountPickerSheet',
  component: GoogleAccountPickerSheet,
  args: {
    open: true,
    onOpenChange: () => {},
    onPick: () => {},
    accounts: googlePickerAccounts,
  },
} satisfies Meta<typeof GoogleAccountPickerSheet>
export default meta
type Story = StoryObj<typeof meta>
export const Open: Story = {}
export const OpenLight: Story = { globals: { theme: 'light' } }
export const LongNames: Story = {
  args: {
    accounts: [
      {
        name: 'Maria Cristina Dela Cruz-Villanueva',
        email: 'maria.cristina.dela.cruz.villanueva.plays@example.com',
        hint: 'A very long name and email wrap instead of overflowing',
      },
    ],
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
