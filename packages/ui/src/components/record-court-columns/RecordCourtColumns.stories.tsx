import { type SessionRecordMatch, sessionRecordFixture } from '@rotra/data/fixtures/session-record'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { type RecordCourtColumn, RecordCourtColumns } from './RecordCourtColumns'

const { matches, replay } = sessionRecordFixture

const toCard = (m: SessionRecordMatch, highlighted = false) => ({
  id: m.id,
  number: m.number,
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
  highlighted,
})

const labels = [...new Set(matches.map((m) => m.courtLabel))]
const columns: RecordCourtColumn[] = labels.map((label) => ({
  label,
  matches: matches
    .filter((m) => m.courtLabel === label)
    .map((m) => toCard(m, m.startedAt <= replay.mid.value && replay.mid.value < m.endedAt)),
}))

const meta = {
  title: 'Queue/RecordCourtColumns',
  component: RecordCourtColumns,
  args: { columns, onSelectPlayer: fn() },
} satisfies Meta<typeof RecordCourtColumns>

export default meta
type Story = StoryObj<typeof meta>

/** Thursday Open Play, with the matches on court mid-night highlighted. */
export const SeveralCourts: Story = { name: 'Several courts' }

/** A court that hosted nothing shows "No matches.". */
export const EmptyCourt: Story = {
  name: 'A court with no matches',
  args: { columns: [...columns, { label: `Court ${labels.length + 1}`, matches: [] }] },
}
