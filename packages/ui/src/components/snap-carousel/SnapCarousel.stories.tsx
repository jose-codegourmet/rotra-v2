import type { Meta, StoryObj } from '@storybook/react-vite'
import { SnapCarousel } from './SnapCarousel'

const items = ['One', 'Two', 'Three', 'Four'].map((name) => ({
  id: name,
  node: (
    <div className="grid h-40 w-56 place-items-center rounded-lg border border-border-strong bg-surface font-semibold">
      {name}
    </div>
  ),
}))
const meta = {
  title: 'Shared/SnapCarousel',
  component: SnapCarousel,
  args: { items, label: 'Cards' },
} satisfies Meta<typeof SnapCarousel>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { globals: { theme: 'dark' } }
export const Light: Story = { globals: { theme: 'light' } }
export const StartAtThird: Story = { args: { startAt: 'Three' }, globals: { theme: 'dark' } }
export const OneItem: Story = { args: { items: items.slice(0, 1) }, globals: { theme: 'dark' } }
export const Phone: Story = { globals: { theme: 'dark', viewport: { value: 'phone' } } }
