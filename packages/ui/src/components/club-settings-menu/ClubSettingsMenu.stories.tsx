import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { ClubSettingsMenu, type ClubSettingsSection } from './ClubSettingsMenu'

function Demo({
  initial = 'identity',
  startOpen = false,
}: {
  initial?: ClubSettingsSection
  startOpen?: boolean
}) {
  const [current, setCurrent] = useState<ClubSettingsSection>(initial)
  const [open, setOpen] = useState(startOpen)
  return (
    <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-5 max-[760px]:grid-cols-[minmax(0,1fr)]">
      <div>
        <ClubSettingsMenu
          current={current}
          onSelect={setCurrent}
          onSignOut={fn()}
          open={open}
          onOpenChange={setOpen}
        />
      </div>
      <p className="text-fg2">Section: {current}</p>
    </div>
  )
}

const meta = {
  title: 'Queue/ClubSettingsMenu',
  component: ClubSettingsMenu,
  args: { current: 'identity', onSelect: fn(), onSignOut: fn() },
} satisfies Meta<typeof ClubSettingsMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Identity: Story = { render: () => <Demo /> }
export const SessionDefaults: Story = { render: () => <Demo initial="defaults" /> }
export const FacebookPost: Story = { render: () => <Demo initial="post" /> }
export const License: Story = { render: () => <Demo initial="license" /> }
export const Downloads: Story = { render: () => <Demo initial="device" /> }
export const Account: Story = { render: () => <Demo initial="account" /> }
export const PhoneClosed: Story = {
  render: () => <Demo />,
  globals: { viewport: { value: 'phone' } },
}
export const PhoneDrawerOpen: Story = {
  render: () => <Demo startOpen />,
  globals: { viewport: { value: 'phone' } },
}
