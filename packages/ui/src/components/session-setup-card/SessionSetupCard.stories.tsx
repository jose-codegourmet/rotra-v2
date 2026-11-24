import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import { Button } from '@rotra/ui/button'
import { formatTime } from '@rotra/ui/now-card/helpers'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionSetupCard } from './SessionSetupCard'

const meta = {
  title: 'Queue/SessionSetupCard',
  component: SessionSetupCard,
  decorators: [
    (Story) => (
      <div className="max-w-[480px]">
        <Story />
      </div>
    ),
  ],
  args: {
    courtLabels: ['Court 1', 'Court 2', 'Court 3', 'Court 4'],
    formatsLabel: 'Doubles',
    modeLabel: 'Fair',
    modeDescription: 'Mainly level-matched games, roughly 10% easy games.',
    minimumGames: 4,
    minimum: {
      kind: 'calculated',
      players: 17,
      usableCourts: 4,
      durationLabel: '3 h',
      low: 4,
      high: 6,
    },
    rosterCount: 17,
    presentCount: 13,
  },
} satisfies Meta<typeof SessionSetupCard>

export default meta
type Story = StoryObj<typeof meta>

export const Calculated: Story = {}
export const SetByYou: Story = {
  args: { minimumGames: 5, minimum: { kind: 'set', low: 4, high: 6 } },
}
export const WithCosts: Story = {
  args: {
    extraRows: [{ label: 'Costs', value: '₱3,060 estimated · ₱219 a player to break even' }],
  },
}
/** Record games off: "Off · no results kept" */
export const RecordGamesOff: Story = { args: { recordGames: false } }
export const RecordGamesOffLight: Story = { ...RecordGamesOff, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }

export const LiveSettings: Story = {
  args: {
    recordGames: false,
    fixedAfterStart: true,
    courtLabels: queueSessionFixtures.courts
      .filter((court) => court.sessionId === queueSessionFixtures.sessions[0]?.id)
      .map((court) => {
        const session = queueSessionFixtures.sessions[0]
        if (!session) throw new Error('Session fixture missing')
        return `${court.label} · ${formatTime(court.startsAt ?? session.scheduledStartAt)}–${formatTime(court.openUntil ?? session.scheduledEndAt)} · ${court.openUntil === null ? 'follows session end' : 'set time'}`
      }),
    actions: (
      <>
        <Button size="sm">Courts and time</Button>
        <Button size="sm">Add player</Button>
        <Button size="sm">Join requests · 0</Button>
        <Button size="sm">Payments</Button>
      </>
    ),
  },
}

export const RequestsSome: Story = { args: { requestFormatLabels: ['2 v 2', '1 v 1'] } }
export const RequestsNone: Story = { args: { requestFormatLabels: [] } }
export const RequestsSomeLight: Story = { ...RequestsSome, globals: { theme: 'light' } }
export const RequestsNoneLight: Story = { ...RequestsNone, globals: { theme: 'light' } }

/** A Scoring row: the mode label; a session saved before the setting reads 16/31. */
export const ScoringBestOfThree: Story = {
  args: {
    scoringLabel: '11/21 × 3',
    scoringDescription: 'Best of 3 games to 21. Change sides at 11. Deuce at 20–20.',
  },
}
export const ScoringBestOfThreeLight: Story = { ...ScoringBestOfThree, globals: { theme: 'light' } }
export const ScoringFixedAfterStart: Story = {
  args: { scoringLabel: '16/31, no deuce', fixedAfterStart: true },
}
/** The Levels row (D-2026-11-19-12): a restriction label, or the slots per level. */
export const LevelsBeginnersOnly: Story = { args: { levelsLabel: 'Beginners only' } }
export const LevelsSlotsPerLevel: Story = {
  args: { levelsLabel: '6 beginner · 5 intermediate · 5 advanced' },
}
export const LevelsSlotsPerLevelLight: Story = { ...LevelsSlotsPerLevel, globals: { theme: 'light' } }
