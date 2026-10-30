import { adminAccessExamples, adminAccount } from '@rotra/data/fixtures/admin-accounts'
import { ADMIN_FIXTURE_NOW } from '@rotra/data/fixtures/admin-clubs'
import { placeholderFeatureFlag } from '@rotra/data/fixtures/feature-flags'
import { Card } from '@rotra/ui/card'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { FeatureFlagRow } from './FeatureFlagRow'

/** The placeholder flag after the platform owner turned it on 25 minutes before ADMIN_FIXTURE_NOW. */
const changed = {
  ...placeholderFeatureFlag,
  revision: 2,
  changedAt: new Date(ADMIN_FIXTURE_NOW.getTime() - 25 * 6e4).toISOString(),
}

const meta = {
  title: 'Admin/FeatureFlagRow',
  component: FeatureFlagRow,
  args: {
    flag: { ...changed, on: false },
    lastChangedBy: adminAccount.email,
    onRequestToggle: fn(),
  },
  decorators: [
    (Story) => (
      <Card className="max-w-[720px]">
        <Story />
      </Card>
    ),
  ],
} satisfies Meta<typeof FeatureFlagRow>

export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {}
export const On: Story = { args: { flag: { ...changed, on: true } } }
/** The placeholder flag as defined: off and never changed. */
export const NeverChanged: Story = {
  args: { flag: placeholderFeatureFlag, lastChangedBy: undefined },
}
export const LongDescription: Story = {
  args: {
    flag: {
      ...changed,
      description: `${placeholderFeatureFlag.description} ${placeholderFeatureFlag.description} ${placeholderFeatureFlag.description}`,
    },
    lastChangedBy: adminAccessExamples.longEmail,
  },
}
export const Disabled: Story = { args: { disabled: true } }
export const Phone: Story = { ...LongDescription, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { ...On, globals: { viewport: { value: 'desktop' } } }
export const OffLight: Story = { globals: { theme: 'light' } }
export const OnLight: Story = { ...On, globals: { theme: 'light' } }
export const NeverChangedLight: Story = { ...NeverChanged, globals: { theme: 'light' } }
