import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import type { Match } from '@rotra/data/match/types'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import {
  type MatchRequestCandidate,
  type PlayerPickerCandidate,
  type PlayerPickerLineupProps,
  PlayerPickerSheet,
  type PlayerPickerSheetProps,
} from './PlayerPickerSheet'

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

// The props are a union (lineup | matchRequest); the meta and its args cover the lineup picker,
// and the match-request stories supply their own render.
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
} satisfies Meta<PlayerPickerLineupProps>

export default meta
type Story = StoryObj<PlayerPickerLineupProps>

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

// Match request: present players other than the viewer (the first present player here).
const viewerId = players.find((p) => p.present)?.id
const requestPlayers: MatchRequestCandidate[] = players
  .filter((p) => p.present && p.id !== viewerId)
  .map(({ id, name, photoUrl, level, games, playingOn, restMinutes }) => ({
    id,
    name,
    photoUrl,
    level,
    games,
    playingOn,
    restMinutes,
  }))

type MatchRequestArgs = Partial<Extract<PlayerPickerSheetProps, { variant: 'matchRequest' }>>
const matchRequest = (args: MatchRequestArgs = {}): Story => ({
  render: () => (
    <PlayerPickerSheet
      variant="matchRequest"
      open
      onOpenChange={fn()}
      spotLabel="Partner"
      players={requestPlayers}
      minimumGames={session.minimumGames}
      onChoose={fn()}
      onAnyone={fn()}
      onBack={fn()}
      {...args}
    />
  ),
})

/** Match request: All tab, All levels, Fewest games first (default) */
export const MatchRequest: Story = matchRequest()

/** Playing tab: present players on a court */
export const MatchRequestPlaying: Story = matchRequest({ initialShow: 'playing' })

/** Available tab: present players off court */
export const MatchRequestAvailable: Story = matchRequest({ initialShow: 'available' })

/** Skill filter: Beginner */
export const MatchRequestBeginner: Story = matchRequest({ initialSkill: 'beginner' })

/** Skill filter: Intermediate */
export const MatchRequestIntermediate: Story = matchRequest({ initialSkill: 'intermediate' })

/** Skill filter: Advanced */
export const MatchRequestAdvanced: Story = matchRequest({ initialSkill: 'advanced' })

/** Sort: ↓ Longest wait */
export const MatchRequestLongestWait: Story = matchRequest({ initialSort: 'waitDesc' })

/** Sort: ↑ Shortest wait */
export const MatchRequestShortestWait: Story = matchRequest({ initialSort: 'waitAsc' })

/** Sort: ↓ Most games */
export const MatchRequestMostGames: Story = matchRequest({ initialSort: 'gamesDesc' })

/** The second opponent spot, with two players already picked (Already picked, disabled) */
export const MatchRequestAlreadyPicked: Story = matchRequest({
  spotLabel: 'Opponent 2',
  pickedIds: requestPlayers.slice(0, 2).map((p) => p.id),
})

/** The spot already holds a player (shown pressed) */
export const MatchRequestCurrent: Story = matchRequest({ currentId: requestPlayers[0]?.id })

/** Nobody else is present: "No other present players." */
export const MatchRequestEmpty: Story = matchRequest({ players: [] })

export const MatchRequestPhone: Story = {
  ...matchRequest(),
  globals: { viewport: { value: 'phone' } },
}
export const MatchRequestDesktop: Story = {
  ...matchRequest(),
  globals: { viewport: { value: 'desktop' } },
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
