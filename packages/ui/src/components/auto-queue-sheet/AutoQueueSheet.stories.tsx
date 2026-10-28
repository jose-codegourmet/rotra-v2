import { matchLineupFixtures } from '@rotra/data/fixtures/match-lineups'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { type AutoQueueCount, AutoQueueSheet, type AutoQueueSheetProps } from './AutoQueueSheet'

const { autoQueue, bothFormatsOff } = matchLineupFixtures

function Demo(args: AutoQueueSheetProps) {
  const [count, setCount] = useState<AutoQueueCount>(args.count)
  return (
    <AutoQueueSheet
      {...args}
      count={count}
      onCountChange={(next) => {
        args.onCountChange(next)
        setCount(next)
      }}
    />
  )
}

const meta = {
  title: 'Queue/AutoQueueSheet',
  component: AutoQueueSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    sessionMode: autoQueue.sessionMode,
    allowSingles: autoQueue.allowSingles,
    allowDoubles: autoQueue.allowDoubles,
    presentCount: autoQueue.presentCount,
    minimumGames: autoQueue.minimumGames,
    count: 3,
    onCountChange: fn(),
    onGenerate: fn(),
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof AutoQueueSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Three: Story = { name: '3 matches (preselected)' }
export const Two: Story = { name: '2 matches', args: { count: 2 } }
export const Four: Story = { name: '4 matches', args: { count: 4 } }
export const Six: Story = { name: '6 matches', args: { count: 6 } }
export const BothFormats: Story = { args: { allowSingles: true, allowDoubles: true } }
export const Failed: Story = {
  args: { allowSingles: false, allowDoubles: false, error: bothFormatsOff },
}
export const Pending: Story = { args: { isPending: true } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
