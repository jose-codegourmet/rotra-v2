import { devMenuFixtures, playerRankOptions, leaderboardOptions } from '@rotra/data/fixtures/dev-menu'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { DevMenu, type DevMenuProps } from './DevMenu'

function Demo(args: DevMenuProps) {
  const [open, setOpen] = useState(args.open)
  const [toggles, setToggles] = useState(args.toggles)
  return (
    <DevMenu
      {...args}
      open={open}
      onOpenChange={setOpen}
      toggles={toggles}
      onToggle={(key, value) => setToggles((state) => ({ ...state, [key]: value }))}
      onReset={() => setToggles(devMenuFixtures.default)}
    />
  )
}
const meta = {
  title: 'Shared/DevMenu',
  component: DevMenu,
  render: Demo,
  args: {
    open: true,
    onOpenChange: () => {},
    toggles: devMenuFixtures.default,
    onToggle: () => {},
    onReset: () => {},
  },
} satisfies Meta<typeof DevMenu>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Offline: Story = { args: { toggles: devMenuFixtures.offline } }
export const Expired: Story = { args: { toggles: devMenuFixtures.expired } }
export const SaveFailure: Story = { args: { toggles: devMenuFixtures.saveFailure } }
export const Conflict: Story = { args: { toggles: devMenuFixtures.conflict } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }

export const PlayerScenarios: Story = {
  args: { playerScenarios: {
    rank: 'on-leaderboard', leaderboard: 'normal', rankOptions: playerRankOptions, leaderboardOptions,
    onRankChange: () => {}, onLeaderboardChange: () => {},
  } },
}
