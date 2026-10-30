import type { Meta, StoryObj } from '@storybook/react-vite'
import { FixedRulesCard } from './FixedRulesCard'

const meta = {
  title: 'Admin/FixedRulesCard',
  component: FixedRulesCard,
  decorators: [
    (Story) => (
      <div className="max-w-[720px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FixedRulesCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const DefaultLight: Story = { globals: { theme: 'light' } }
