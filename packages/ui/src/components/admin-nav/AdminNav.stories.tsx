import { adminAccount, adminAccessExamples, adminNavExamples } from '@rotra/data/fixtures/admin-accounts'
import { AppShell } from '@rotra/ui/app-shell'
import { TopBar } from '@rotra/ui/app-shell/top-bar'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AdminNav } from './AdminNav'

const meta = {
  title: 'Admin/AdminNav', component: AdminNav,
  args: { current: 'clubs', hrefs: adminNavExamples.hrefs, accountEmail: adminAccount.email, onSignOut: () => {} },
  parameters: { layout: 'fullscreen' },
  render: (args) => <AppShell railWidth={236} topBar={<TopBar product="Admin" contained={false} />} rail={<AdminNav {...args} />}><div /></AppShell>,
} satisfies Meta<typeof AdminNav>
export default meta
type Story = StoryObj<typeof meta>
export const ClubsCurrent: Story = {}
export const PlayersCurrent: Story = { args: { current: 'players' } }
export const ContactChangesCurrent: Story = { args: { current: 'contact-changes' } }
export const ClubNamesCurrent: Story = { args: { current: 'club-names' } }
export const RankingCurrent: Story = { args: { current: 'ranking' } }
export const FeatureFlagsCurrent: Story = { args: { current: 'feature-flags' } }
export const WithCounts: Story = { args: { counts: adminNavExamples.counts } }
export const ZeroCounts: Story = { args: { counts: adminNavExamples.zeroCounts } }
export const NoCounts: Story = {}
export const LongEmail: Story = { args: { accountEmail: adminAccessExamples.longEmail } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
