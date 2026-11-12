import { Card } from '@rotra/ui/card'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { PullToRefresh, type PullToRefreshProps } from './PullToRefresh'

const Page = () => (
  <main className="mx-auto flex max-w-[760px] flex-col gap-3 px-4 pt-5 pb-[120px]">
    <p className="text-sm text-fg2">
      Pull the page down from the top (touch) to refresh. The pill slides in from under the top bar.
    </p>
    {Array.from({ length: 12 }, (_, i) => (
      <Card key={i} className="h-16" />
    ))}
  </main>
)

function Demo(args: Omit<PullToRefreshProps, 'children'>) {
  const [updated, setUpdated] = useState(args.updatedLabel)
  return (
    <PullToRefresh
      {...args}
      updatedLabel={updated}
      onRefresh={async () => {
        await new Promise((r) => setTimeout(r, 700))
        setUpdated(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
      }}
    >
      <Page />
    </PullToRefresh>
  )
}

const meta = {
  title: 'Shared/PullToRefresh',
  component: PullToRefresh,
  render: (args) => <Demo {...args} />,
  parameters: { layout: 'fullscreen' },
  args: {
    updatedLabel: '7:42 PM',
    throttled: false,
    offline: false,
    children: null,
    onRefresh: () => undefined,
  },
} satisfies Meta<typeof PullToRefresh>

export default meta
type Story = StoryObj<typeof meta>

/** Pull, release past the arm point, "Refreshing…", then "Updated TIME" for a moment. */
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
/** Refreshed less than 10 s ago: a full pull says "Refresh again in a few seconds" and nothing runs. */
export const Throttled: Story = {
  args: { throttled: true },
  globals: { viewport: { value: 'phone' } },
}
/** Offline: a full pull says "You're offline. Reconnect and try again." */
export const Offline: Story = { args: { offline: true }, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
