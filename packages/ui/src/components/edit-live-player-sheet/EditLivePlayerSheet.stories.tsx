import type { ClubPlayerPictureState } from '@rotra/data/club-player/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
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

/** Registered: Club nickname field, no picture editor */
export const Registered: Story = {}

/** Unclaimed: the picture editor, no nickname field */
export const Unclaimed: Story = {
  args: {
    shownName: 'Dani Reyes',
    fullName: 'Dani Reyes',
    kind: 'unclaimed',
    level: 'beginner_high',
    clubNickname: null,
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

/** Guest: no Profile section, only Tonight */
export const Guest: Story = {
  args: {
    shownName: 'Ken Villar',
    fullName: 'Ken Villar',
    kind: 'guest',
    level: null,
    clubNickname: null,
    accountNickname: null,
    games: 0,
    present: false,
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

export const Pending: Story = { args: { isPending: true } }

export const Failed: Story = {
  args: { error: 'Could not save. Check your connection and try again.' },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
