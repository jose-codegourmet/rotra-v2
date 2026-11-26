import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { type QueueViewMode, QueueViewSwitch } from './QueueViewSwitch'

const meta = {
  title: 'Queue/QueueViewSwitch',
  component: QueueViewSwitch,
  args: { value: 'slide', onChange: fn() },
} satisfies Meta<typeof QueueViewSwitch>

export default meta
type Story = StoryObj<typeof meta>

export const Slide: Story = {}
export const Grid: Story = { args: { value: 'grid' } }
export const GridLight: Story = { args: { value: 'grid' }, globals: { theme: 'light' } }

export const Interactive: Story = {
  render: (args) => {
    const [mode, setMode] = useState<QueueViewMode>('slide')
    return <QueueViewSwitch {...args} value={mode} onChange={setMode} />
  },
}

/** The Courts header's layout switch: Grid mode first, Slide mode second (list icon) */
export const CourtLayout: Story = {
  args: { value: 'grid', label: 'Court layout', gridFirst: true, slideIcon: 'list' },
}
export const CourtLayoutSlide: Story = {
  args: { value: 'slide', label: 'Court layout', gridFirst: true, slideIcon: 'list' },
}
export const CourtLayoutLight: Story = { ...CourtLayout, globals: { theme: 'light' } }
