import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import type { Match } from '@rotra/data/match/types'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { type PlayerPickerCandidate, PlayerPickerSheet } from './PlayerPickerSheet'

const { session, roster, courts, matches } = consoleSessionFixture
const NOW = session.scheduledEndAt - 7200000

const inMatch = (m: Match, id: string) => m.teamA.includes(id) || m.teamB.includes(id)
// Counted games, the active match and the rest since the last game, as the queue rules compute them.
const gamesOf = (p: SessionPlayer) =>
  matches.filter((m) => m.state === 'completed' && inMatch(m, p.id)).length
const activeOf = (p: SessionPlayer) => matches.find((m) => m.state === 'active' && inMatch(m, p.id))
const courtLabel = (m: Match) =>
  m.courtIds.map((id) => courts.find((c) => c.id === id)?.label ?? 'Court').join(' + ')
const restOf = (p: SessionPlayer) => {
  const ends = matches
    .filter((m) => (m.state === 'completed' || m.state === 'invalid') && inMatch(m, p.id))
    .map((m) => m.endedAt ?? 0)
  return Math.max(0, Math.floor((NOW - Math.max(p.presentChangedAt ?? NOW, ...ends)) / 60000))
}

const candidate = (p: SessionPlayer): PlayerPickerCandidate => {
  const active = activeOf(p)
  return {
    id: p.id,
    name: p.nameSnapshot,
    nickname: p.nicknameSnapshot,
    level: p.level,
    games: gamesOf(p),
    present: p.present,
    playingOn: active ? courtLabel(active) : null,
    restMinutes: restOf(p),
  }
}

// The prototype's picker order: off court first, present first, fewest games, longest rest.
const players = roster
  .map(candidate)
  .sort(
    (a, b) =>
      Number(a.playingOn !== null) - Number(b.playingOn !== null) ||
      Number(b.present) - Number(a.present) ||
      a.games - b.games ||
      b.restMinutes - a.restMinutes,
  )

// Editing match 3 (players 4 and 6 vs 7 and 8): choosing Team A · player 2 with the others taken.
const edited = matches[2]
if (!edited) throw new Error('Console fixture missing match 3')
const currentId = edited.teamA[1] ?? null
const takenIds = [...edited.teamA, ...edited.teamB].filter((id) => id !== currentId)

const meta = {
  title: 'Queue/PlayerPickerSheet',
  component: PlayerPickerSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    team: 'A',
    slotIndex: 1,
    players,
    minimumGames: session.minimumGames,
    currentId,
    takenIds,
    onChoose: fn(),
    onBack: fn(),
  },
} satisfies Meta<typeof PlayerPickerSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Available now (default): present players who are off court, fewest games first */
export const AvailableNow: Story = {}

/** All present: adds the players on court, with "Playing · Court X" */
export const AllPresent: Story = { args: { initialFilter: 'present' } }

/** Everyone: adds absent players, greyed with "Not present" */
export const Everyone: Story = { args: { initialFilter: 'everyone' } }

/** A fresh slot: nobody pressed, the other slots still disabled */
export const EmptySlot: Story = { args: { team: 'B', slotIndex: 0, currentId: null } }

/** No one is free: everyone present is on court or in the match */
export const NoOneFree: Story = {
  args: {
    players: players.filter((p) => !p.present || p.playingOn !== null),
  },
}

/** A search with no match: "No player matches." */
export const NoSearchMatch: Story = {
  args: { initialFilter: 'everyone' },
  play: async ({ canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.type(await body.findByPlaceholderText('Name or nickname'), 'zzz')
  },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
