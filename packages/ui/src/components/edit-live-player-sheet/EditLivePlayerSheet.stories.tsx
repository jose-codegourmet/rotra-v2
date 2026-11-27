import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { EditLivePlayerSheet } from './EditLivePlayerSheet'

const meta = {
  title: 'Queue/EditLivePlayerSheet',
  component: EditLivePlayerSheet,
  args: {
    open: true,
    onSave: fn(),
    onCancel: fn(),
    shownName: 'Migs',
    fullName: 'Migs Alcantara',
    kind: 'registered',
    level: 'intermediate_mid',
    clubNickname: 'Migs',
    accountNickname: 'MigsA',
    games: 3,
    present: true,
  },
} satisfies Meta<typeof EditLivePlayerSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Registered: Club nickname (their club's label), Tonight and Handicap */
export const Registered: Story = {}

/** Unclaimed: Club nickname is their only nickname */
export const Unclaimed: Story = {
  args: {
    shownName: 'Jom',
    fullName: 'Jomar Dela Cruz',
    kind: 'unclaimed',
    level: 'beginner_high',
    clubNickname: 'Jom',
    accountNickname: null,
  },
}

export const UnclaimedLight: Story = {
  ...Unclaimed,
  globals: { theme: 'light' },
}

/** Guest: Club nickname, not present */
export const Guest: Story = {
  args: {
    shownName: 'Lia Bautista',
    fullName: 'Lia Bautista',
    kind: 'guest',
    level: null,
    clubNickname: null,
    accountNickname: null,
    games: 0,
    present: false,
  },
}

export const RegisteredLight: Story = { globals: { theme: 'light' } }

/** Preparing (Roster and levels pencil): Club nickname and Handicap only */
export const Preparing: Story = {
  args: { mode: 'preparing', handicapSpots: ['right_knee'] },
}
export const PreparingLight: Story = { ...Preparing, globals: { theme: 'light' } }

/** Not here picked for a player in a match: the hint says it does not take them off the match */
export const NotHereInAMatch: Story = {
  args: {
    match: { status: 'playing', courtLabel: 'Court 2' },
    present: false,
  },
}

export const OnCourt: Story = {
  args: { match: { status: 'oncourt', courtLabel: 'Court 1' } },
}

/** Handicap · tonight (D-2026-11-25-03): left knee and lower back marked */
export const WithHandicap: Story = { args: { handicapSpots: ['left_knee', 'lower_back'] } }
/** Three spots marked: the chips wrap under the figure */
export const WithHandicapSeveral: Story = {
  args: { handicapSpots: ['left_knee', 'lower_back', 'right_shoulder'] },
}
export const WithHandicapLight: Story = {
  args: { handicapSpots: ['left_knee', 'lower_back'] },
  globals: { theme: 'light' },
}

export const Pending: Story = { args: { isPending: true } }

export const Failed: Story = {
  args: { error: 'Could not save. Check your connection and try again.' },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
