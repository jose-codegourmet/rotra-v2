import type { ClubPlayer } from '@rotra/data/club-player/types'
import {
  clubPlayers,
  directoryPlayers,
  leaderboardLevels,
  leaderboardPlayers,
  players,
} from '@rotra/data/fixtures/players'
import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import { admissionCapacityFixture as admission } from '@rotra/data/fixtures/session-waitlist'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { type AddPlayerCandidate, AddPlayerSheet, type AddPlayerSheetProps } from './AddPlayerSheet'

const tonight = queueSessionFixtures.sessions[0]
if (!tonight) throw new Error('Session fixture missing')
const CAPACITY = 3 * tonight.playersPerCourt
const ROSTER_IDS = queueSessionFixtures.roster.map((r) => r.clubPlayerId)

// Saved players as the mock store's clubPlayerView() presents them: RTR ID from the public profile
// (an older unclaimed record has none and shows Details required, D-2026-11-16-04), the club level
// as the suggestion, and the first and fourth players hiding their phone.
const savedCandidates: AddPlayerCandidate[] = clubPlayers.map((p: ClubPlayer, i) => ({
  id: p.id,
  name: p.fullName,
  nickname: p.nickname,
  rtrId:
    p.identity === 'unclaimed' ? null : (players.find((x) => x.id === p.playerId)?.rtrId ?? null),
  identity: p.identity,
  suggestion: p.playingLevel,
  phoneHidden: i === 0 || i === 3,
  detailsRequired:
    p.identity === 'unclaimed' && !players.find((x) => x.id === p.playerId)?.rtrId,
}))

// Directory suggestions: registered players, with their leaderboard level and position.
const directoryCandidates: AddPlayerCandidate[] = directoryPlayers.map((p) => ({
  id: p.id,
  name: p.fullName,
  nickname: p.nickname,
  rtrId: p.rtrId,
  identity: 'registered',
  suggestion: leaderboardLevels[p.id] ?? null,
  rankLabel: `Rank ${leaderboardPlayers.findIndex((entry) => entry.id === p.id) + 1}`,
}))

// Another club's unclaimed player: Player Information returns an RTR ID and nothing else.
const OTHER_CLUB_RTR = 'RTR-PH-MNL-020326-0231'
const OTHER_CLUB_EMAIL = 'maria.santos@example.com'
const otherClubUnclaimed: AddPlayerCandidate = {
  id: 'other-club-unclaimed',
  name: '',
  rtrId: OTHER_CLUB_RTR,
  identity: 'unclaimed',
  suggestion: null,
  ownNameRequired: true,
}
const firstDirectory = directoryCandidates[0]
if (!firstDirectory?.rtrId) throw new Error('Directory fixture missing')
const savedWithRtr = savedCandidates.find((p) => p.rtrId)
if (!savedWithRtr?.rtrId) throw new Error('Saved player with an RTR ID missing')

type SessionSheetProps = Extract<AddPlayerSheetProps, { sessionTitle: string }>
/** The session sheet's args, plus `club` to render the Saved players (no session) context. */
type DemoProps = SessionSheetProps & { club?: boolean }

/**
 * Answers Player Information searches like the mock store does: the exact RTR ID or email only, empty
 * until one matches, and a saved player's own RTR ID answers "already in your saved players".
 */
function Demo({ club, ...props }: DemoProps) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const saved = savedCandidates.find((p) => q && p.rtrId?.toLowerCase() === q)
  const results = saved
    ? []
    : q === OTHER_CLUB_EMAIL
      ? [otherClubUnclaimed]
      : directoryCandidates.filter((p) => q && p.rtrId?.toLowerCase() === q).concat(
          q === OTHER_CLUB_RTR ? [otherClubUnclaimed] : [],
        )
  if (club)
    return (
      <AddPlayerSheet
        context="club"
        open={props.open}
        onOpenChange={props.onOpenChange}
        offline={props.offline}
        isPending={props.isPending}
        serverError={props.serverError}
        serverErrorReturnsToList={props.serverErrorReturnsToList}
        lastAdded={props.lastAdded}
        addedCount={props.addedCount}
        initialTab={props.initialTab}
        // The story args are fn() spies; the club context only widens the level to allow null.
        onConfirm={props.onConfirm as never}
        onSubmitNewPlayer={props.onSubmitNewPlayer as never}
        onDirectorySearch={setQuery}
        directoryResults={props.directoryResults ?? results}
        directorySavedName={saved?.name}
        newPlayerEmailSavedAs={props.newPlayerEmailSavedAs}
      />
    )
  return (
    <AddPlayerSheet
      {...props}
      onDirectorySearch={setQuery}
      directoryResults={props.directoryResults ?? results}
      directorySavedName={saved?.name}
    />
  )
}

/** Types into the Player Information search, as the Queue Master would. */
const searchFor =
  (value: string): Story['play'] =>
  async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.type(await body.findByRole('searchbox', { name: /Search Player Information/ }), value)
  }

const meta = {
  title: 'Queue/AddPlayerSheet',
  component: Demo,
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
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

/** Saved players tab with 17 of the 23 saved players already in the session. */
export const SavedPlayers: Story = {}

export const AllInSession: Story = {
  args: { inSessionIds: savedCandidates.map((p) => p.id) },
}

/** Player Information search empty: "Full RTR ID or email", the hint, and nothing listed until one matches. */
export const PlayerInformation: Story = { args: { initialTab: 'directory' } }
export const PlayerInformationLight: Story = {
  ...PlayerInformation,
  globals: { theme: 'light' },
}

/** One registered match for the exact RTR ID. */
export const PlayerInformationRegisteredMatch: Story = {
  args: { initialTab: 'directory' },
  play: searchFor(firstDirectory.rtrId),
}

/** Another club's unclaimed player: "Not registered yet", the RTR ID, no name, picture or level. */
export const PlayerInformationOtherClubUnclaimed: Story = {
  args: { initialTab: 'directory' },
  play: searchFor(OTHER_CLUB_RTR),
}

/** Picking it asks for this club's own name for them ("Enter a name." if it stays empty). */
export const OtherClubUnclaimedNameField: Story = {
  args: { initialTab: 'directory' },
  play: async (context) => {
    await searchFor(OTHER_CLUB_EMAIL)?.(context)
    const body = within(context.canvasElement.ownerDocument.body)
    await userEvent.click(await body.findByRole('button', { name: /Not registered yet/ }))
  },
}
export const OtherClubUnclaimedNameFieldLight: Story = {
  ...OtherClubUnclaimedNameField,
  globals: { theme: 'light' },
}

/** An RTR ID or email nobody has: "No ROTRA player has that RTR ID or email." */
export const PlayerInformationNoMatch: Story = {
  args: { initialTab: 'directory' },
  play: searchFor('RTR-PH-MNL-000000-0000'),
}

/** The RTR ID belongs to a saved player: "NAME is already in your saved players." */
export const PlayerInformationAlreadySaved: Story = {
  args: { initialTab: 'directory' },
  play: searchFor(savedWithRtr.rtrId),
}

export const PlayerInformationOffline: Story = {
  args: { initialTab: 'directory', offline: true },
}

export const PlayerInformationLoading: Story = {
  args: { initialTab: 'directory', directoryLoading: true },
}

/** New player: Email (optional) with its hint, no phone. */
export const NewPlayer: Story = { args: { initialTab: 'new' } }

/** New player: the email typed is already a saved player; nothing is saved. */
export const NewPlayerEmailAlreadySaved: Story = {
  args: { initialTab: 'new', newPlayerEmailSavedAs: savedCandidates[0]?.name ?? 'Jomar Dela Cruz' },
}

export const NewPlayerFull: Story = {
  args: {
    initialTab: 'new',
    openSlots: 0,
    inSessionIds: ROSTER_IDS.slice(0, 10),
    waitlistCount: 2,
  },
}

export const AfterOneAdd: Story = {
  args: { lastAdded: 'Santino added · Intermediate Mid', addedCount: 1 },
}

export const AfterThreeAdds: Story = {
  args: { lastAdded: 'Nathan added as a guest', addedCount: 3 },
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

export const ActiveFull: Story = {
  args: { live: true, capacity: admission.capacity, openSlots: 0 },
}

/** Saved players › Add player: no session, opens on Player Information, the primary saves. */
export const SavedPlayersClub: Story = { args: { club: true } }
/** Club context, New player: the level is optional and the primary reads Save player. */
export const SavedPlayersClubNewPlayer: Story = { args: { club: true, initialTab: 'new' } }
/** Club context, after a save: the sheet stays open and counts what was saved. */
export const SavedPlayersClubAfterSave: Story = {
  args: { club: true, initialTab: 'new', lastAdded: 'Test Guest saved as a guest', addedCount: 2 },
}
/** Club context, a profile that is already saved is refused and the sheet returns to the list. */
export const SavedPlayersClubDuplicate: Story = {
  args: {
    club: true,
    serverError: 'Santino Reyes is already in your saved players.',
    serverErrorReturnsToList: true,
  },
}
export const SavedPlayersClubOffline: Story = { args: { club: true, offline: true } }
export const SavedPlayersClubPhone: Story = {
  args: { club: true, initialTab: 'new' },
  globals: { viewport: { value: 'phone' } },
}

// A saved player not in the session and without a level opens the level step; one with a level is
// added in one tap.
const notInSession = savedCandidates.filter((p) => !ROSTER_IDS.includes(p.id))
const noLevel = notInSession.find((p) => !p.suggestion) ?? notInSession[0]
const withLevel = notInSession.find((p) => p.suggestion)
const unclaimedSaved = notInSession.find((p) => p.detailsRequired)

/** An older unclaimed record lists "Details required" with the warn chip (guests still read Guest). */
export const DetailsRequiredRow: Story = {
  args: { savedPlayers: unclaimedSaved ? [unclaimedSaved, ...savedCandidates] : savedCandidates },
}
export const DetailsRequiredRowLight: Story = {
  ...DetailsRequiredRow,
  globals: { theme: 'light' },
}

/** A pick with a level is added in one tap: onConfirm fires with that level, no card opens. */
export const PickWithLevelOneTap: Story = {
  play: async ({ canvasElement, args }) => {
    if (!withLevel) return
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(body.getByRole('button', { name: new RegExp(withLevel.name) }))
    await expect(args.onConfirm).toHaveBeenCalled()
    await expect(body.getByRole('dialog', { name: 'Add player' })).toBeInTheDocument()
  },
}

/** A pick without a level opens the level step; the title stays "Add player". */
export const PickWithoutLevel: Story = {
  args: {
    savedPlayers: noLevel
      ? [{ ...noLevel, suggestion: null }, ...savedCandidates.filter((p) => p.id !== noLevel.id)]
      : savedCandidates,
  },
  play: async ({ canvasElement }) => {
    if (!noLevel) return
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(body.getByRole('button', { name: new RegExp(noLevel.name) }))
    await expect(body.getByRole('dialog', { name: 'Add player' })).toBeInTheDocument()
  },
}
export const PickWithoutLevelLight: Story = { ...PickWithoutLevel, globals: { theme: 'light' } }
export const PickWithoutLevelPhone: Story = {
  ...PickWithoutLevel,
  globals: { viewport: { value: 'phone' } },
}
