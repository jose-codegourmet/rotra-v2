import type { AdminPlayer } from '@rotra/data/admin-player/types'
import { managementPlayer } from '@rotra/data/fixtures/admin-player-management'
import { AdminPlayerActions } from '@rotra/ui/admin-player-actions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { AdminPlayerCard } from './AdminPlayerCard'

const meta = {
  title: 'Admin/AdminPlayerCard',
  component: AdminPlayerCard,
  args: { player: managementPlayer, href: '#', createdBy: 'Created by Admin', onOpen: () => {} },
} satisfies Meta<typeof AdminPlayerCard>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Light: Story = { globals: { theme: 'light' } }

const registered: AdminPlayer = {
  ...managementPlayer,
  claimed: true,
  email: 'alex.reyes@example.com',
  registeredOn: '2026-10-05',
  levelIndex: 5,
  rankStatus: { kind: 'board', text: 'Intermediate Mid · on the overall leaderboard' },
  verification: { verified: false, verifiedByAdmin: false, completedSteps: 2 },
}
const verified: AdminPlayer = {
  ...registered,
  verification: { verified: true, verifiedByAdmin: false, completedSteps: 3 },
}
const unclaimed: AdminPlayer = { ...managementPlayer, email: 'alex.reyes@example.com' }
/** Two clubs saved the same unclaimed person, each under its own name. */
const savedByTwo: AdminPlayer = {
  ...unclaimed,
  name: 'Nina Ocampo',
  levelIndex: 3,
  rankStatus: { kind: 'below', text: 'Beginner High · not on the leaderboard until they register' },
  clubs: [
    {
      clubId: 'c1',
      name: 'Talamban Racket Club',
      addedAt: null,
      savedAs: 'Nina Ocampo',
      identity: 'unclaimed',
    },
    {
      clubId: 'c2',
      name: 'IT Park Badminton Club',
      addedAt: null,
      savedAs: 'Nina O.',
      identity: 'unclaimed',
    },
  ],
}
/** Registered row. */
export const RegisteredRow: Story = { args: { player: registered } }
export const RegisteredRowLight: Story = { ...RegisteredRow, globals: { theme: 'light' } }
/** A verified player: Verified in place of Registered (D-2026-11-23-07). */
export const VerifiedRow: Story = { args: { player: verified } }
export const VerifiedRowLight: Story = { ...VerifiedRow, globals: { theme: 'light' } }
/** Unclaimed with an email. */
export const UnclaimedRow: Story = { args: { player: unclaimed } }
export const UnclaimedRowLight: Story = { ...UnclaimedRow, globals: { theme: 'light' } }
/** An older unclaimed record with a phone and no email: the warn Details required chip. */
export const DetailsRequired: Story = { args: { player: managementPlayer, detailsRequired: true } }
export const DetailsRequiredLight: Story = { ...DetailsRequired, globals: { theme: 'light' } }
/** "<First club> and 1 more club" and the Not on leaderboard chip. */
export const SavedByTwoClubs: Story = { args: { player: savedByTwo } }
export const SavedByTwoClubsLight: Story = { ...SavedByTwoClubs, globals: { theme: 'light' } }
export const GridRegistered: Story = { args: { player: registered, view: 'grid' } }
export const GridUnclaimed: Story = { args: { player: unclaimed, view: 'grid' } }
export const GridDetailsRequired: Story = {
  args: { player: managementPlayer, detailsRequired: true, view: 'grid' },
}
export const GridSavedByTwoClubs: Story = { args: { player: savedByTwo, view: 'grid' } }
export const GridSavedByTwoClubsLight: Story = {
  ...GridSavedByTwoClubs,
  globals: { theme: 'light' },
}
export const Archived: Story = {
  args: { player: { ...managementPlayer, archivedAt: '2026-10-31' } },
}
export const LongName: Story = {
  args: {
    player: {
      ...managementPlayer,
      name: 'Alexandria Maria Reyes de la Cruz',
      nickname: 'Alexandria',
    },
  },
}
export const FiveClubs: Story = {
  args: {
    player: {
      ...managementPlayer,
      clubs: Array.from({ length: 5 }, (_, i) => ({
        clubId: String(i),
        name: `Club ${i + 1}`,
        addedAt: null,
        identity: i === 3 ? 'pending' : i === 4 ? 'guest' : 'unclaimed',
      })),
    },
  },
}

export const Selectable: Story = {
  args: { actions: <AdminPlayerActions player={managementPlayer} onAction={() => {}} /> },
  render: (args) => {
    const [selected, setSelected] = useState(false)
    return <AdminPlayerCard {...args} selected={selected} onSelect={setSelected} />
  },
}
export const SelectableLight: Story = { ...Selectable, globals: { theme: 'light' } }
export const Selected: Story = { args: { selected: true, onSelect: () => {} } }

export const Grid: Story = {
  args: {
    view: 'grid',
    selected: false,
    onSelect: () => {},
    actions: <AdminPlayerActions player={managementPlayer} onAction={() => {}} />,
  },
  decorators: [
    (Story) => (
      <div className="grid max-w-[340px] grid-cols-2 gap-2.5">
        <Story />
        <Story />
      </div>
    ),
  ],
}
export const GridLight: Story = { ...Grid, globals: { theme: 'light' } }
export const GridSelected: Story = { ...Grid, args: { ...Grid.args, selected: true } }
export const GridSelectedLight: Story = { ...GridSelected, globals: { theme: 'light' } }
export const SelectedLight: Story = { ...Selected, globals: { theme: 'light' } }

export const SavedCharacter: Story = {
  args: { player: { ...managementPlayer, picture: 'character:a' } },
}
export const SavedCharacterGrid: Story = {
  ...Grid,
  args: { ...Grid.args, player: { ...managementPlayer, picture: 'character:a' } },
}
export const FailedPicture: Story = {
  args: { player: { ...managementPlayer, picture: 'data:image/png;base64,invalid' } },
}
