import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import type { SessionPlayer } from '@rotra/data/session-roster/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { PlayerPoolCard, type PlayerPoolCardProps } from './PlayerPoolCard'

const { roster, matches } = consoleSessionFixture

const playerAt = (i: number): SessionPlayer => {
  const p = roster[i]
  if (!p) throw new Error(`No roster player ${i} in the console fixture`)
  return p
}

// Counted games: completed matches the player was in (the prototype's gamesOf()).
const gamesOf = (p: SessionPlayer) =>
  matches.filter(
    (m) => m.state === 'completed' && (m.teamA.includes(p.id) || m.teamB.includes(p.id)),
  ).length

const propsFor = (
  p: SessionPlayer,
  status: PlayerPoolCardProps['status'],
  waitMinutes?: number,
): PlayerPoolCardProps => ({
  name: p.nameSnapshot,
  level: p.level,
  games: gamesOf(p),
  forTheNight: gamesOf(p) + (status.kind === 'queued' ? 1 : 0),
  waitMinutes,
  status,
  present: p.present,
  onToggleSelect: fn(),
  onPresentChange: fn(),
})

// Fixture roles: 0–3 are on Court 1 (match 1), 4 waits in match 2 (queue #1), 5 is away, 10 is free.
const playing = propsFor(playerAt(0), { kind: 'playing', courtLabel: 'Court 1', minutes: 7 })
const queued = propsFor(playerAt(4), { kind: 'queued', position: 1 }, 12)
const away = propsFor(playerAt(5), { kind: 'away' })
const free = propsFor(playerAt(10), { kind: 'free' }, 27)

const meta = {
  title: 'Queue/PlayerPoolCard',
  component: PlayerPoolCard,
  decorators: [
    (Story) => (
      <div className="w-[176px]">
        <Story />
      </div>
    ),
  ],
  args: free,
} satisfies Meta<typeof PlayerPoolCard>

export default meta
type Story = StoryObj<typeof meta>

/** Present, off court and in no waiting match: shows the wait time and "Free" */
export const Available: Story = {}
/** Handicap · tonight (D-2026-11-25-03): the warning icon after the name, titled "Handicap: left knee, lower back" */
export const WithHandicap: Story = { args: { handicapSpots: ['left_knee', 'lower_back'] } }
export const WithHandicapLight: Story = { ...WithHandicap, globals: { theme: 'light' } }
/** On court: the status line turns accent and no wait time shows */
/** "Playing 7m"; hovering the pill shows "Playing on Court 1" */
export const Playing: Story = { args: playing }
/** On court but not started yet: "Getting ready" */
export const GettingReady: Story = {
  args: { ...playing, status: { kind: 'playing', courtLabel: 'Court 2', minutes: null } },
}
export const GettingReadyLight: Story = { ...GettingReady, globals: { theme: 'light' } }
/** Not present: greyed picture, "Away", Present switch off */
export const Away: Story = { args: away }
/** Away, no games, in no match: No show (cancelled) is the only button (no Move to waitlist during play) */
export const AwayNoShow: Story = { args: { ...away, games: 0, forTheNight: 0, onNoShow: fn() } }
export const AwayNoShowLight: Story = { ...AwayNoShow, globals: { theme: 'light' } }
/** Present and already in a waiting match */
export const Queued: Story = { args: queued }
/** "Queued · #1 · 45 min wait" */
export const Queued45Min: Story = { args: { ...queued, waitMinutes: 45 } }
/** "Queued · #1 · 2 h wait" (whole hours, rounded down) */
export const Queued2Hours: Story = { args: { ...queued, waitMinutes: 120 } }
/** "Queued · #1 · long time ago" (from 24 h, no "wait") */
export const Queued30Hours: Story = { args: { ...queued, waitMinutes: 30 * 60 } }
/** Picked for the next match: accent ring and the pick-order badge */
export const SelectedWithOrder: Story = { args: { selected: true, pickOrder: 2 } }
export const NoLevel: Story = { args: { level: null } }
/** The live console passes onSetGames: Current is a button (dashed underline, hover tint) that opens Set games played */
export const WithSetGames: Story = { args: { onSetGames: fn() } }
/** The picture opens the profile card; the rest of the card still selects. */
export const WithProfileButton: Story = { args: { onOpenProfile: fn(), onSetGames: fn() } }
/** Clamped at two lines with an ellipsis */
export const LongName: Story = {
  args: { name: `${free.name} Bautista Villareal de la Cruz Santos Dela Rosa` },
}

/** Tap, Enter or Space toggles selection; the Present switch is its own control */
export const Interactive: Story = {
  render: (args) => {
    const [selected, setSelected] = useState(false)
    const [present, setPresent] = useState(args.present)
    return (
      <PlayerPoolCard
        {...args}
        selected={selected}
        pickOrder={1}
        present={present}
        status={present ? args.status : { kind: 'away' }}
        onToggleSelect={() => setSelected((s) => !s)}
        onPresentChange={setPresent}
      />
    )
  },
}

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,156px),1fr))] gap-2'

/** The prototype's .pgrid3 at 375 px: two cards per row, 54 × 32 px switches */
export const GridPhone: Story = {
  decorators: [
    (Story) => (
      <div className={`w-[343px] ${GRID}`}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <PlayerPoolCard {...free} selected pickOrder={1} />
      <PlayerPoolCard {...queued} selected pickOrder={2} />
      <PlayerPoolCard {...playing} />
      <PlayerPoolCard {...away} />
    </>
  ),
  globals: { viewport: { value: 'phone' } },
}

/** The same cards at 1280 px: compact switches */
export const GridDesktop: Story = {
  decorators: [
    (Story) => (
      <div className={`max-w-4xl ${GRID}`}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <PlayerPoolCard {...free} selected pickOrder={1} />
      <PlayerPoolCard {...queued} selected pickOrder={2} />
      <PlayerPoolCard {...playing} />
      <PlayerPoolCard {...away} />
      <PlayerPoolCard {...propsFor(playerAt(6), { kind: 'queued', position: 2 }, 9)} />
      <PlayerPoolCard {...propsFor(playerAt(11), { kind: 'free' }, 41)} />
    </>
  ),
  globals: { viewport: { value: 'desktop' } },
}

export const SavingPresence: Story = { args: { ...away, presencePending: true } }

export const SelfCheckedIn: Story = {
  args: { selfCheckedInAt: new Date('2026-11-09T19:21:00').getTime() },
}
export const Left: Story = { args: { ...away, leftAt: new Date('2026-11-09T19:21:00').getTime() } }
export const AvailableLight: Story = { globals: { theme: 'light' } }
export const PlayingLight: Story = { args: playing, globals: { theme: 'light' } }
export const AwayLight: Story = { args: away, globals: { theme: 'light' } }
export const QueuedLight: Story = { args: queued, globals: { theme: 'light' } }
export const SelectedLight: Story = {
  args: { selected: true, pickOrder: 2 },
  globals: { theme: 'light' },
}
export const SelfCheckedInLight: Story = { ...SelfCheckedIn, globals: { theme: 'light' } }
export const LeftLight: Story = { ...Left, globals: { theme: 'light' } }

/** No games: 0 | 0 */
export const NoGames: Story = { args: { ...free, games: 0, forTheNight: 0, onSetGames: fn() } }
/** Queued games: Total is higher than Current */
export const QueuedGames: Story = { args: { ...queued, onSetGames: fn() } }
export const WithSetGamesLight: Story = { ...WithSetGames, globals: { theme: 'light' } }

/** Each level band colours the picture ring; hover the picture to read the level */
const BANDS = ['beginner_low', 'intermediate_mid', 'advanced_high', null] as const
export const LevelRings: Story = {
  decorators: [
    (Story) => (
      <div className={`max-w-4xl ${GRID}`}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      {BANDS.map((level) => (
        <PlayerPoolCard key={level ?? 'none'} {...free} level={level} />
      ))}
    </>
  ),
}
export const LevelRingsLight: Story = { ...LevelRings, globals: { theme: 'light' } }

/** One name: club nickname first, then nickname, then the full name; hover shows the full name */
export const ClubNickname: Story = { args: { nickname: 'Migs', clubNickname: 'Migo' } }
export const NicknameOnly: Story = { args: { nickname: 'Migs' } }
export const FullNameOnly: Story = {}
export const ClubNicknameLight: Story = { ...ClubNickname, globals: { theme: 'light' } }
