import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { userEvent, within } from 'storybook/test'
import { TabDrawer } from './TabDrawer'

const items = [
  { value: 'live', label: 'Courts', badges: [{ text: 'Vacant 1', tone: 'warn' as const }] },
  { value: 'queue', label: 'Queue', badges: [{ text: '4' }] },
  { value: 'roster', label: 'Players', badges: [{ text: '13/14' }] },
  { value: 'board', label: 'Leaderboard', badges: [{ text: 'Jose leads' }] },
]

function Example({ initial = 'live' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <TabDrawer
      items={items}
      value={value}
      onChange={setValue}
      aria-label="Console views"
      menuLabel="Console view"
      title="Live session"
    />
  )
}

const meta = {
  title: 'Shared/TabDrawer',
  component: TabDrawer,
  args: {
    items,
    value: 'live',
    onChange: () => {},
    'aria-label': 'Console views',
    title: 'Live session',
  },
  globals: { viewport: { value: 'phone' } },
} satisfies Meta<typeof TabDrawer>
export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = { render: () => <Example /> }

export const Open: Story = {
  render: () => <Example initial="queue" />,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: /Open the views menu/ }),
    )
  },
}

export const OpenLight: Story = {
  ...Open,
  globals: { viewport: { value: 'phone' }, theme: 'light' },
}

export const ClosedLight: Story = {
  render: () => <Example />,
  globals: { viewport: { value: 'phone' }, theme: 'light' },
}
