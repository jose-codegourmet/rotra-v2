import {
  consoleSessionFixture,
  mergedConsoleSessionFixture,
} from '@rotra/data/fixtures/consoleSessions'
import type { Match } from '@rotra/data/match/types'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import type { PlayerPickerCandidate } from '@rotra/ui/player-picker-sheet'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn, within } from 'storybook/test'
import { MatchLineupForm } from './MatchLineupForm'

// The live console fixture: Sunday Night Queue with Doubles on and Singles off, three courts,
// match 1 active on Court 1, player 5 away.
const { session, roster, courts, matches } = consoleSessionFixture
const NOW = session.scheduledEndAt - 7200000
const enabledFormats = { singles: session.allowSingles, doubles: session.allowDoubles }

const inMatch = (m: Match, id: string) => m.teamA.includes(id) || m.teamB.includes(id)
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
// Picker order: off court first, present first, fewest games, longest rest.
const players = roster
  .map(candidate)
  .sort(
    (a, b) =>
      Number(a.playingOn !== null) - Number(b.playingOn !== null) ||
      Number(b.present) - Number(a.present) ||
      a.games - b.games ||
      b.restMinutes - a.restMinutes,
  )

const matchAt = (i: number): Match => {
  const m = matches[i]
  if (!m) throw new Error(`No match ${i + 1} in the console fixture`)
  return m
}
// Match 2 (blocked: player 0 is playing on Court 1), match 4 (player 5 is not present) and the
// merged 5v5 on two courts.
const blocked = matchAt(1)
const absent = matchAt(3)
const fiveVFive = mergedConsoleSessionFixture.matches[0]
if (!fiveVFive) throw new Error('Merged console fixture missing')

const meta = {
  title: 'Queue/MatchLineupForm',
  component: MatchLineupForm,
  args: {
    open: true,
    onOpenChange: fn(),
    mode: 'add',
    enabledFormats,
    players,
    minimumGames: session.minimumGames,
    onSubmit: fn(),
    onPickSlot: fn(),
  },
} satisfies Meta<typeof MatchLineupForm>

export default meta
type Story = StoryObj<typeof meta>

// The sheet is portaled to <body>, outside the story root.
const submit: Story['play'] = async ({ canvasElement, userEvent }) => {
  const body = within(canvasElement.ownerDocument.body)
  await userEvent.click(await body.findByRole('button', { name: /Add to queue|Save lineup/ }))
}

/** Add match: opens on Doubles (Singles is off for this session) with four empty slots */
export const AddDoublesEmpty: Story = {}

/** Edit lineup: match 2's doubles, with a player who is playing now */
export const EditFilled: Story = {
  args: { mode: 'edit', lineup: blocked },
}

/** Edit lineup with a player who is not present */
export const EditNotPresent: Story = {
  args: { mode: 'edit', lineup: absent },
}

/** 5v5 fun: five slots a side, the fun hint and "5v5 occupies two courts." */
export const Fun5v5: Story = {
  args: { mode: 'edit', lineup: fiveVFive },
}

/** Submitting with empty slots: "Fill every slot. Team sizes are fixed by the format." */
export const FillEverySlotError: Story = {
  args: { defaultValues: { teamA: [blocked.teamA[0] ?? null, null] } },
  play: submit,
}

/** The same player in two slots: "Each player can only take one slot in a match." */
export const DuplicatePlayerError: Story = {
  args: {
    defaultValues: {
      teamA: [blocked.teamA[0] ?? null, blocked.teamA[1] ?? null],
      teamB: [blocked.teamA[0] ?? null, blocked.teamB[1] ?? null],
    },
  },
  play: submit,
}

/** Singles off: it never appears in the format buttons (this session allows Doubles only) */
export const SinglesOff: Story = {
  args: { enabledFormats: { singles: false, doubles: true } },
}

/** Both standard formats off: opens on 3v3 fun */
export const StandardFormatsOff: Story = {
  args: { enabledFormats: { singles: false, doubles: false } },
}

/** Both standard formats on: Singles, Doubles, then the fun formats */
export const AllFormats: Story = {
  args: { enabledFormats: { singles: true, doubles: true } },
}

/** Tapping a slot opens "Choose Team A · player 1" */
export const PickerOpen: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(await body.findByRole('button', { name: 'Choose Team A player 1' }))
  },
}

export const Pending: Story = { args: { mode: 'edit', lineup: blocked, isPending: true } }

/** A save failed: the error shows and the lineup stays */
export const ServerError: Story = {
  args: {
    mode: 'edit',
    lineup: blocked,
    serverError: 'Changes could not be saved. Check the connection and try again.',
  },
}

export const Phone: Story = {
  args: { mode: 'edit', lineup: blocked },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = {
  args: { mode: 'edit', lineup: blocked },
  globals: { viewport: { value: 'desktop' } },
}
