import type { ClubPlayerPictureState } from '@rotra/data/club-player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { EditLivePlayerSheet } from './EditLivePlayerSheet'

const noPicture: ClubPlayerPictureState = {
  kind: 'initials',
  reference: null,
  characterId: null,
  previousSrc: null,
}

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

/** Registered: Full name read-only, Club nickname field, no picture editor */
export const Registered: Story = {}

/** Unclaimed: editable Full name, Club nickname (their only nickname), the picture editor */
export const Unclaimed: Story = {
  args: {
    shownName: 'Jom',
    fullName: 'Jomar Dela Cruz',
    kind: 'unclaimed',
    level: 'beginner_high',
    clubNickname: 'Jom',
    accountNickname: null,
    picture: {
      playerId: 'cp-dani',
      picture: noPicture,
      onChange: fn(),
      onRemove: fn(),
      onUsePrevious: fn(),
    },
  },
}

export const UnclaimedLight: Story = {
  ...Unclaimed,
  globals: { theme: 'light' },
}

/** Guest: editable Full name and Club nickname, no picture editor */
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

/** An empty (or 1-character) Full name on Save changes: the error shows, the field takes focus, the sheet stays open */
export const NameError: Story = {
  args: Unclaimed.args,
  play: async ({ args }) => {
    const screen = within(document.body)
    const name = await screen.findByLabelText('Full name')
    await userEvent.clear(name)
    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }))
    await expect(await screen.findByText('Enter the full name, at least 2 characters.')).toBeVisible()
    await expect(name).toHaveFocus()
    await expect(args.onSave).not.toHaveBeenCalled()
  },
}

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
