import { adminNavExamples } from '@rotra/data/fixtures/admin-accounts'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminOfflineBand } from './AdminOfflineBand'

const meta = {
  title: 'Admin/AdminOfflineBand',
  component: AdminOfflineBand,
  args: { loadedAt: adminNavExamples.loadedAt },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AdminOfflineBand>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
