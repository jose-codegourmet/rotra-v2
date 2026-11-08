import { Button } from '@rotra/ui/button'
import { Chip } from '@rotra/ui/chip'
import { Icon } from '@rotra/ui/icon'
import { IconButton } from '@rotra/ui/icon-button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PageHeader } from './PageHeader'

const meta = {
  title: 'Shared/PageHeader',
  component: PageHeader,
  args: {
    title: 'Clubs and licenses',
    description:
      'Club accounts, their prices and license terms, and what happens to their public pages after a license ends. Clubs pay outside ROTRA; you record the payment here when you activate or renew.',
    actions: <Button variant="primary">Add club</Button>,
  },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LiveConsole: Story = {
  args: {
    title: 'Sunday Night Queue',
    description: 'RK Sports Center · Started 6:02 PM · Ends 9:00 PM',
    eyebrow: (
      <>
        <span className="text-xs font-semibold tracking-[0.5px] text-fg2 uppercase">
          Live session
        </span>
        <Chip>Fair</Chip>
        <Chip>Doubles</Chip>
        <Chip>Min 4 games</Chip>
      </>
    ),
    actions: (
      <>
        <Button size="sm">Home</Button>
        <Button size="sm">Public page</Button>
        <Button size="sm">Copy Facebook post</Button>
        <Button size="sm">Payments</Button>
        <Button size="sm">Extend time</Button>
      </>
    ),
  },
}

export const LiveConsolePhone: Story = { ...LiveConsole, globals: { viewport: { value: 'phone' } } }

export const WithTitleAction: Story = {
  args: {
    title: 'Sunday Night Queue',
    description: 'Sat, Nov 8 · 7:00 PM–10:00 PM · Greenfield Sports Hall',
    titleAction: (
      <IconButton variant="ghost" size="sm" label="Open public page">
        <Icon name="external" />
      </IconButton>
    ),
  },
}

export const WithTitleActionPhone: Story = {
  ...WithTitleAction,
  globals: { viewport: { value: 'phone' } },
}
