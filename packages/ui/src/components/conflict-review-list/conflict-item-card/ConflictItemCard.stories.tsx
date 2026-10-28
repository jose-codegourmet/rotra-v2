import { syncConflictsFixture } from '@rotra/data/fixtures/sync-recovery'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ConflictItemCard } from './ConflictItemCard'
const meta = { title: 'Queue/ConflictItemCard', component: ConflictItemCard, args: { conflict: syncConflictsFixture[0]!, onSelectPlayer: fn() } } satisfies Meta<typeof ConflictItemCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
