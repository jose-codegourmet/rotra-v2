import { PageHeader } from '@rotra/ui/page-header'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionTitleLink } from './SessionTitleLink'

const meta = {
  title: 'Queue/SessionTitleLink',
  component: SessionTitleLink,
  args: { title: 'Thursday Smash Night', href: '/sessions/s1/public-page' },
  decorators: [(Story) => <PageHeader title={<Story />} description="Thu, Oct 23 · 7:00 PM" />],
} satisfies Meta<typeof SessionTitleLink>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { globals: { theme: 'dark' } }
export const DefaultLight: Story = { globals: { theme: 'light' } }
export const LongTitlePhone: Story = {
  args: { title: 'Thursday Smash Night at the Downtown Sports Complex, all levels welcome' },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
