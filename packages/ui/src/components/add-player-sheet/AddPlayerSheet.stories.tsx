import type { ClubPlayer } from '@rotra/data/club-player/types'
import { clubPlayers, directoryPlayers, players } from '@rotra/data/fixtures/players'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { type AddPlayerCandidate, AddPlayerSheet, type AddPlayerSheetProps } from './AddPlayerSheet'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')
const CAPACITY = 3 * tonight.playersPerCourt
const ROSTER_IDS = queueSessionFixtures.roster.map((r) => r.clubPlayerId)

// Saved players as the mock store's clubPlayerView() presents them: RTR ID from the public profile,
// the club level as the suggestion, and the first and fourth players hiding their phone.
const savedCandidates: AddPlayerCandidate[] = clubPlayers.map((p: ClubPlayer, i) => ({
  id: p.id,
  name: p.fullName,
  nickname: p.nickname,
  rtrId: players.find((x) => x.id === p.playerId)?.rtrId ?? null,
  identity: p.identity,
  suggestion: p.playingLevel,
  phoneHidden: i === 0 || i === 3,
}))

// The Queue prototype's DIRECTORY: identity, suggestion and rank label for the four fixture profiles.
const DIRECTORY_EXTRA = [
  { identity: 'registered', suggestion: 'advanced_low', rankLabel: 'Rank 214' },
  { identity: 'registered', suggestion: 'intermediate_high', rankLabel: 'Rank 388' },
  { identity: 'unclaimed', suggestion: 'beginner_high', rankLabel: 'Not ranked yet' },
  { identity: 'registered', suggestion: 'intermediate_mid', rankLabel: 'Rank 1,042' },
] as const satisfies readonly Pick<AddPlayerCandidate, 'identity' | 'suggestion' | 'rankLabel'>[]
const directoryCandidates: AddPlayerCandidate[] = directoryPlayers.map((p, i) => {
  const extra = DIRECTORY_EXTRA[i]
  if (!extra) throw new Error('Directory fixture missing')
  return { id: p.id, name: p.fullName, nickname: p.nickname, rtrId: p.rtrId, ...extra }
})

/** Answers Player Information searches from the fixtures, like the mock store does. */
function Demo(props: AddPlayerSheetProps) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const results = directoryCandidates.filter(
    (p) => !q || [p.name, p.rtrId].some((v) => v?.toLowerCase().includes(q)),
  )
  return (
    <AddPlayerSheet
      {...props}
      onDirectorySearch={setQuery}
      directoryResults={props.directoryResults ?? results}
    />
  )
}

const meta = {
  title: 'Queue/AddPlayerSheet',
  component: AddPlayerSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    sessionTitle: tonight.title,
    capacity: CAPACITY,
    openSlots: CAPACITY - ROSTER_IDS.length,
    waitlistCount: 0,
    savedPlayers: savedCandidates,
    inSessionIds: ROSTER_IDS,
    onConfirm: fn(),
    onSubmitNewPlayer: fn(),
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof AddPlayerSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Saved players tab with 14 of the 20 saved players already in the session. */
export const SavedPlayers: Story = {}

export const AllInSession: Story = {
  args: { inSessionIds: savedCandidates.map((p) => p.id) },
}

/** The online search answers from the four fixture profiles. */
export const PlayerInformation: Story = { args: { initialTab: 'directory' } }

export const PlayerInformationOffline: Story = {
  args: { initialTab: 'directory', offline: true },
}

export const PlayerInformationLoading: Story = {
  args: { initialTab: 'directory', directoryLoading: true },
}

export const NewPlayer: Story = { args: { initialTab: 'new' } }

export const NewPlayerFull: Story = {
  args: {
    initialTab: 'new',
    openSlots: 0,
    inSessionIds: ROSTER_IDS.slice(0, 10),
    waitlistCount: 2,
  },
}

export const AfterOneAdd: Story = {
  args: { lastAdded: 'Marco Lopez added · Intermediate Mid', addedCount: 1 },
}

export const AfterThreeAdds: Story = {
  args: { lastAdded: 'Kiko Salazar added as a guest', addedCount: 3 },
}

export const SessionFull: Story = {
  args: { openSlots: 0, inSessionIds: ROSTER_IDS.slice(0, 10), waitlistCount: 2 },
}

export const LiveSession: Story = { args: { live: true } }

export const Pending: Story = { args: { isPending: true } }

/** A save failed on the New player form: the error shows and what was typed stays. */
export const Refused: Story = {
  args: { initialTab: 'new', serverError: 'Changes could not be saved' },
}

/** A duplicate from Player Information: the pick was refused and the sheet is back on the list. */
export const DuplicateReturnsToList: Story = {
  args: {
    initialTab: 'directory',
    serverError: 'This player is already on the roster or waitlist.',
    serverErrorReturnsToList: true,
  },
}

/** Offline: the Player Information tab shows its notice; nothing searches or spins. */
export const Offline: Story = { args: { initialTab: 'directory', offline: true } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
