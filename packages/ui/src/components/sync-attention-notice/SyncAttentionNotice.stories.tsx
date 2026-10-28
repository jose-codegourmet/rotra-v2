import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SyncAttentionNotice } from './SyncAttentionNotice'

const meta = {
  title: 'Queue/SyncAttentionNotice',
  component: SyncAttentionNotice,
  args: { variant: 'retry', onRetry: fn() },
} satisfies Meta<typeof SyncAttentionNotice>
export default meta
type Story = StoryObj<typeof meta>
export const Retry: Story = {}
export const NotSaved: Story = { args: { variant: 'not-saved' } }
export const AuthorizationCanFinish: Story = {
  args: { variant: 'authorization', canFinishAndSync: true },
}
export const AuthorizationBlocked: Story = {
  args: { variant: 'authorization', canFinishAndSync: false },
}
export const Incomplete: Story = { args: { variant: 'incomplete' } }
