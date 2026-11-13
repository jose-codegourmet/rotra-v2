import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatsFire } from './StatsFire'

const meta = {
  title: 'Shared/StatsFire',
  component: StatsFire,
  args: { rate: 62 },
  decorators: [(Story) => <div className="flex h-20 items-end bg-surface p-4">{Story()}</div>],
} satisfies Meta<typeof StatsFire>
export default meta
type Story = StoryObj<typeof meta>

export const Middle: Story = {}
export const MiddleLight: Story = { globals: { theme: 'light' } }
export const Low: Story = { args: { rate: 8 } }
export const Full: Story = { args: { rate: 100 } }
export const FullLight: Story = { args: { rate: 100 }, globals: { theme: 'light' } }
/** 0%: no fire at all */
export const Zero: Story = { args: { rate: 0 } }
