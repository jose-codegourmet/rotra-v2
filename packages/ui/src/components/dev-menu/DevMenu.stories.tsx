import { devMenuFixtures, playerRankOptions, leaderboardOptions } from '@rotra/data/fixtures/dev-menu'
import { rankingSettings } from '@rotra/data/fixtures/ranking-settings'
import { players } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { DevMenu, type DevMenuProps } from './DevMenu'

const migs = players.find((player) => player.nickname === 'Migs')
if (!migs) throw new Error('Missing Migs fixture')
const migsName = migs.fullName

function Demo(args: DevMenuProps) {
  const [open, setOpen] = useState(args.open)
  const [toggles, setToggles] = useState(args.toggles)
  const [rank, setRank] = useState(args.playerScenarios?.rank ?? 'on-leaderboard')
  const [leaderboard, setLeaderboard] = useState(args.playerScenarios?.leaderboard ?? 'normal')
  const [accountName, setAccountName] = useState(args.playerAccount?.name ?? null)
  const [settings, setSettings] = useState(args.rankingSettings)
  return <DevMenu {...args} open={open} onOpenChange={setOpen} toggles={toggles}
    onToggle={(key, value) => setToggles((state) => ({ ...state, [key]: value }))}
    playerScenarios={args.playerScenarios ? { ...args.playerScenarios, rank, leaderboard, onRankChange: setRank, onLeaderboardChange: setLeaderboard } : undefined}
    playerAccount={args.playerAccount ? { ...args.playerAccount, name: accountName, onSignIn: () => setAccountName(migsName), onSignOut: () => setAccountName(null) } : undefined}
    rankingSettings={settings ? { ...settings, onChange: (value) => setSettings({ ...settings, ...value }) } : undefined}
    onReset={() => { setToggles(devMenuFixtures.default); setRank('on-leaderboard'); setLeaderboard('normal'); setAccountName(null); setSettings(args.rankingSettings) }}
  />
}
const meta = {
  title: 'Shared/DevMenu', component: DevMenu, render: Demo,
  args: { open: true, onOpenChange: () => {}, toggles: devMenuFixtures.default, onToggle: () => {}, onReset: () => {} },
} satisfies Meta<typeof DevMenu>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Offline: Story = { args: { toggles: devMenuFixtures.offline } }
export const Expired: Story = { args: { toggles: devMenuFixtures.expired } }
export const SaveFailure: Story = { args: { toggles: devMenuFixtures.saveFailure } }
export const Conflict: Story = { args: { toggles: devMenuFixtures.conflict } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }

const playerArgs = {
  playerScenarios: {
    rank: 'on-leaderboard', leaderboard: 'normal', rankOptions: playerRankOptions, leaderboardOptions,
    onRankChange: () => {}, onLeaderboardChange: () => {},
  },
  playerAccount: { name: null, onSignIn: () => {}, onSignOut: () => {} },
  rankingSettings: { ...rankingSettings, onChange: () => {} },
}
export const PlayerScenarios: Story = { args: playerArgs }
export const PlayerSignedIn: Story = { args: { ...playerArgs, playerAccount: { ...playerArgs.playerAccount, name: migsName } } }
export const PlayerOffline: Story = { args: { ...playerArgs, toggles: devMenuFixtures.offline } }
export const PlayerPhone: Story = { args: playerArgs, globals: { viewport: { value: 'phone' } } }
