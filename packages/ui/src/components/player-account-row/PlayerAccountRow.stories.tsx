import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlayerAccountRow } from './PlayerAccountRow'

const meta = {
  title: 'Player/PlayerAccountRow',
  component: PlayerAccountRow,
  args: { name: 'Migs Santos', detail: 'RTR-1042', mono: true },
  decorators: [
    (Story) => (
      <div className="w-[min(420px,100vw-32px)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlayerAccountRow>
export default meta
type Story = StoryObj<typeof meta>
export const WithRtrId: Story = {}
export const WithEmail: Story = { args: { detail: 'migs.santos@example.com', mono: false } }
export const LongName: Story = {
  args: { name: 'Maria Cristina Dela Cruz-Villanueva the Third', detail: 'RTR-2001' },
}
export const WithRtrIdLight: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
