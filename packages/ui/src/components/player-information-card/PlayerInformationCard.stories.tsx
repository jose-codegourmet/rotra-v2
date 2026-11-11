import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { PlayerInformationCard } from './PlayerInformationCard'

const meta = {
  title: 'Player/PlayerInformationCard',
  component: PlayerInformationCard,
  args: { savedHidden: false, onToggle: fn() },
  decorators: [(Story) => <div className="mx-auto max-w-[560px]">{Story()}</div>],
} satisfies Meta<typeof PlayerInformationCard>
export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {}
export const OffLight: Story = { globals: { theme: 'light' } }
export const On: Story = { args: { savedHidden: true } }
export const OnLight: Story = { args: { savedHidden: true }, globals: { theme: 'light' } }
export const Saving: Story = { args: { isPending: true } }
export const SavingLight: Story = { args: { isPending: true }, globals: { theme: 'light' } }
export const OfflineError: Story = {
  args: {
    error: "Couldn't save because you're offline. You are still findable in Player Information.",
  },
}
export const OfflineErrorLight: Story = { ...OfflineError, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
