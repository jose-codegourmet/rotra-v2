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
  { value: 'board', label: 'Leaderboard', shortLabel: 'Board', badges: [{ text: 'Jose leads' }] },
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

// Admin club detail: the prototype's tab badges, including the .bad "Failed" chip.
export const ClubSections: Story = {
  args: {
    'aria-label': 'Club sections',
    value: 'overview',
    items: [
      { value: 'overview', label: 'Overview', badges: [{ text: '1 request', tone: 'warn' }] },
      { value: 'license', label: 'License' },
      { value: 'pages', label: 'Public pages', badges: [{ text: 'Failed', tone: 'error' }] },
      { value: 'activity', label: 'Activity', badges: [{ text: '2' }] },
    ],
  },
}

function PreparationTabs() {
  const [value, setValue] = useState('roster')
  const items: TabItem[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'roster', label: 'Roster and levels', badges: [{ text: '14/24' }] },
    { value: 'waitlist', label: 'Waitlist', badges: [{ text: '2' }] },
    { value: 'payments', label: 'Payments', badges: [{ text: '8/14 paid' }] },
  ]
  return (
    <Tabs items={items} value={value} onChange={setValue} aria-label="Preparation section" phoneMenu>
      {items.map((item) => (
        <TabsContent key={item.value} value={item.value}>{item.label} view</TabsContent>
      ))}
    </Tabs>
  )
}

export const PhoneMenu: Story = {
  render: () => <PreparationTabs />,
  globals: { viewport: { value: 'phone' } },
}
export const PhoneMenuLight: Story = {
  ...PhoneMenu,
  globals: { viewport: { value: 'phone' }, theme: 'light' },
}
export const PhoneMenuDesktop: Story = {
  render: () => <PreparationTabs />,
  globals: { viewport: { value: 'desktop' } },
}
