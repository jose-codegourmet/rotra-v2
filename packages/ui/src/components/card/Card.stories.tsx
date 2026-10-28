import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card } from './Card'

const meta = {
  title: 'Shared/Card',
  component: Card,
  args: {
    children: (
      <div className="flex flex-col gap-1">
        <h2>Sunday Night Queue</h2>
        <p className="text-[13px] text-fg2">RK Sports Center · 6:00 PM – 9:00 PM</p>
      </div>
    ),
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Highlight: Story = { args: { tone: 'highlight' } }
export const Warn: Story = { args: { tone: 'warn' } }
export const AsSection: Story = {
  render: (args) => (
    <Card asChild {...args}>
      <section aria-label="Session">{args.children}</section>
    </Card>
  ),
}
export const LongContent: Story = {
  args: {
    children: (
      <p className="[overflow-wrap:anywhere]">
        Lapu-Lapu City, Cebu · a long address line that must wrap inside the card on a 375 px phone
        without pushing the page sideways.
      </p>
    ),
  },
  globals: { viewport: { value: 'phone' } },
}
