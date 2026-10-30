import {
  rankingPolicyConflictVersion2,
  rankingPolicyVersion1,
} from '@rotra/data/fixtures/ranking-settings'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ConfigConflictNotice } from './ConfigConflictNotice'

const meta = {
  title: 'Admin/ConfigConflictNotice',
  component: ConfigConflictNotice,
  args: {
    currentVersion: rankingPolicyConflictVersion2.version,
    baseVersion: rankingPolicyVersion1.version,
    onRebase: fn(),
    onStartOver: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[960px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ConfigConflictNotice>

export default meta
type Story = StoryObj<typeof meta>

/** Version 2 was saved from another browser while a draft based on version 1 was open. */
export const Default: Story = {}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const DefaultLight: Story = { globals: { theme: 'light' } }
