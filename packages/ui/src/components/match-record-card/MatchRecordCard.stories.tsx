import { activeMatchFixtures } from '@rotra/data/fixtures/active-matches'
import { type SessionRecordMatch, sessionRecordFixture } from '@rotra/data/fixtures/session-record'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { MatchRecordCard, type MatchRecordCardProps } from './MatchRecordCard'

const { matches } = sessionRecordFixture

/** The first Thursday Open Play match matching the predicate; falls back to the first match. */
const matchWhere = (test: (m: SessionRecordMatch) => boolean) => {
  const m = matches.find(test) ?? matches[0]
  if (!m) throw new Error('No matches in the session record fixture')
  return m
}

const propsFor = (
  m: SessionRecordMatch,
  overrides: Partial<MatchRecordCardProps> = {},
): MatchRecordCardProps => ({
  number: m.number,
  courtLabel: m.courtLabel,
  startedAt: m.startedAt,
  endedAt: m.endedAt,
  fun: m.fun,
  teamA: m.teamA,
  teamB: m.teamB,
  winningTeam: m.winningTeam,
  score:
    m.teamAScore != null && m.teamBScore != null
      ? { teamA: m.teamAScore, teamB: m.teamBScore }
      : null,
  invalid: m.invalid,
  substitutions: m.substitutions,
  onSelectPlayer: fn(),
  ...overrides,
})

const meta = {
  title: 'Queue/MatchRecordCard',
  component: MatchRecordCard,
  decorators: [
    (Story) => (
      <div className="w-[300px] max-w-full">
        <Story />
      </div>
    ),
  ],
  args: propsFor(matchWhere((m) => !m.invalid && m.teamAScore != null)),
} satisfies Meta<typeof MatchRecordCard>

export default meta
type Story = StoryObj<typeof meta>

export const WonByScore: Story = { name: 'Won by score' }

/** Confirmed by winner only. */
export const WonWithoutScore: Story = {
  name: 'Won without score',
  args: propsFor(matchWhere((m) => !m.invalid && m.teamAScore == null)),
}

export const Invalid: Story = { args: propsFor(matchWhere((m) => m.invalid)) }

/** The match on court at the replay's current moment. */
export const Highlighted: Story = { args: { highlighted: true } }

export const Fun: Story = { args: { fun: true } }

export const WithSubstitutions: Story = { args: { substitutions: 2 } }

const creditedSub = activeMatchFixtures.withSubstitutions.substitutions[0]

/** One credited substitution line under the count */
export const WithCreditedSubstitution: Story = {
  args: propsFor(
    matchWhere((m) => !m.invalid && m.teamAScore != null),
    {
      substitutions: 1,
      substitutionCredits: creditedSub ? [{ ...creditedSub, creditTo: 'incoming' }] : [],
    },
  ),
}

/** Invalid match: a credit choice still reads as neither gets credit */
export const InvalidWithSubstitution: Story = {
  args: propsFor(
    matchWhere((m) => m.invalid),
    {
      substitutions: 1,
      substitutionCredits: creditedSub ? [{ ...creditedSub, creditTo: 'incoming' }] : [],
    },
  ),
}

export const LongNames: Story = {
  args: propsFor(
    matchWhere((m) => !m.invalid),
    {
      teamA: [
        {
          id: 'long-1',
          name: 'Maria Antonieta Villanueva-Santos de la Cruz',
          shortName: 'Maria Antonieta',
          level: 'intermediate_mid',
        },
        {
          id: 'long-2',
          name: 'Bartholomew Constantine Reyes-Macapagal',
          shortName: 'Bartholomew',
          level: 'advanced_low',
        },
      ],
    },
  ),
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }

export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
