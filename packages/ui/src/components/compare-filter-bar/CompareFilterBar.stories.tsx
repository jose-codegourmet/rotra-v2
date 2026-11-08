import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { counts } from '../shared-game-row/SharedGameRow.storyData'
import { CompareFilterBar, type CompareFilter } from './CompareFilterBar'

const meta = {
  title: 'Player/CompareFilterBar',
  component: CompareFilterBar,
  args: { counts, value: 'all', onChange: () => {} },
} satisfies Meta<typeof CompareFilterBar>
export default meta
type Story = StoryObj<typeof meta>
export const All: Story = {}
export const HeadToHead: Story = { args: { value: 'h2h' } }
export const Together: Story = { args: { value: 'together' } }
export const Empty: Story = { args: { counts: { all: 0, h2h: 0, together: 0 } } }
export const Interactive: Story = {
  render: function Interactive(args) {
    const [value, setValue] = useState<CompareFilter>(args.value)
    return <CompareFilterBar {...args} value={value} onChange={setValue} />
  },
}
export const Light: Story = { globals: { theme: 'light' } }
export const HeadToHeadLight: Story = { ...HeadToHead, globals: { theme: 'light' } }
export const TogetherLight: Story = { ...Together, globals: { theme: 'light' } }
export const EmptyLight: Story = { ...Empty, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
