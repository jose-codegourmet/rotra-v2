import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { type TabItem, Tabs, TabsContent } from './Tabs'

// The live console's tabs, as the Queue prototype labels them.
const CONSOLE_TABS: TabItem[] = [
  { value: 'live', label: 'Session', badges: [{ text: '2/3', longText: ' courts in use' }] },
  {
    value: 'queue',
    label: 'Queue',
    badges: [
      { text: '4', longText: ' waiting' },
      { text: '1', longText: ' need attention', tone: 'warn' },
    ],
  },
  { value: 'roster', label: 'Players', badges: [{ text: '13/14', longText: ' present' }] },
  { value: 'board', label: 'Leaderboard', shortLabel: 'Board', badges: [{ text: 'Migs leads' }] },
]

function ConsoleTabs() {
  const [value, setValue] = useState('live')
  return (
    <Tabs items={CONSOLE_TABS} value={value} onChange={setValue} aria-label="Console views">
      {CONSOLE_TABS.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          <p className="text-fg2">{tab.label} view</p>
        </TabsContent>
      ))}
    </Tabs>
  )
}

const meta = {
  title: 'Shared/Tabs',
  component: Tabs,
  args: { items: CONSOLE_TABS, value: 'live', onChange: () => {}, 'aria-label': 'Console views' },
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Console: Story = { render: () => <ConsoleTabs /> }

export const Phone: Story = {
  render: () => <ConsoleTabs />,
  globals: { viewport: { value: 'phone' } },
}

export const Plain: Story = {
  args: {
    'aria-label': 'Facebook post',
    value: 'post',
    items: [
      { value: 'post', label: 'Post' },
      { value: 'template', label: 'Template' },
    ],
  },
}

export const WithDisabled: Story = {
  args: {
    items: [
      ...CONSOLE_TABS.slice(0, 3),
      { value: 'board', label: 'Leaderboard', shortLabel: 'Board', disabled: true },
    ],
  },
}
