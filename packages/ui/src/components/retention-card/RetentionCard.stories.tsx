import {
  adminClubLicenseStates,
  adminClubRows,
  retentionExamples,
} from '@rotra/data/fixtures/admin-clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RetentionCard } from './RetentionCard'

function retentionOf(username: string) {
  const id = adminClubRows.find((row) => row.username === username)?.id
  const state = adminClubLicenseStates.find((row) => row.id === id)
  if (!state) throw new Error(`Retention fixture missing: ${username}`)
  return state.retention
}

const meta = {
  title: 'Admin/RetentionCard',
  component: RetentionCard,
  args: { retention: retentionOf('tagbilaran.circle') },
} satisfies Meta<typeof RetentionCard>

export default meta
type Story = StoryObj<typeof meta>

export const None: Story = {}
export const Restored: Story = { args: { retention: retentionOf('itpark.badminton') } }
export const Stale: Story = { args: { retention: retentionOf('talamban.racket') } }
export const Due: Story = { args: { retention: retentionExamples.due } }
export const Failed: Story = { args: { retention: retentionOf('bacolod.rally') } }
export const Deleted: Story = { args: { retention: retentionOf('molo.shuttle') } }
export const Phone: Story = { ...Stale, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { ...Stale, globals: { viewport: { value: 'desktop' } } }
export const NoneLight: Story = { globals: { theme: 'light' } }
export const RestoredLight: Story = { ...Restored, globals: { theme: 'light' } }
export const StaleLight: Story = { ...Stale, globals: { theme: 'light' } }
export const DueLight: Story = { ...Due, globals: { theme: 'light' } }
export const FailedLight: Story = { ...Failed, globals: { theme: 'light' } }
export const DeletedLight: Story = { ...Deleted, globals: { theme: 'light' } }
