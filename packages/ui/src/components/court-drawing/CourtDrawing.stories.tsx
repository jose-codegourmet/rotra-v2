import {
  consoleSessionFixture,
  mergedConsoleSessionFixture,
} from '@rotra/data/fixtures/consoleSessions'
import { shortName } from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CourtDrawing, type CourtPlayer } from './CourtDrawing'

const { roster, matches } = consoleSessionFixture
const playerOf = (id: string): CourtPlayer => {
  const p = roster.find((x) => x.id === id)
  if (!p) throw new Error('Roster fixture missing')
  return { id: p.id, name: p.nameSnapshot, shortName: shortName(p), level: p.level }
}
const teamsOf = (m: Match | undefined) => {
  if (!m) throw new Error('Match fixture missing')
  return { teamA: m.teamA.map(playerOf), teamB: m.teamB.map(playerOf) }
}
const doubles = teamsOf(matches[0])
const merged = teamsOf(mergedConsoleSessionFixture.matches[0])

const meta = {
  title: 'Queue/CourtDrawing',
  component: CourtDrawing,
  decorators: [
    (Story) => (
      <div className="w-full max-w-[320px]">
        <Story />
      </div>
    ),
  ],
  args: { ...doubles, onOpenProfile: fn() },
} satisfies Meta<typeof CourtDrawing>

export default meta
type Story = StoryObj<typeof meta>

export const Doubles: Story = {}
export const Singles: Story = {
  args: { teamA: doubles.teamA.slice(0, 1), teamB: doubles.teamB.slice(0, 1) },
}
export const OneVersusTwo: Story = { args: { teamA: doubles.teamA.slice(0, 1) } }
export const ThreeVersusThree: Story = {
  args: { teamA: merged.teamA.slice(0, 3), teamB: merged.teamB.slice(0, 3) },
}
export const FourVersusFour: Story = {
  args: { teamA: merged.teamA.slice(0, 4), teamB: merged.teamB.slice(0, 4) },
}
export const FiveVersusFiveMerged: Story = { args: { ...merged, courts: 2 } }
export const Free: Story = { args: { free: true, teamA: [], teamB: [] } }
export const LongNames: Story = {
  args: {
    teamA: doubles.teamA.map((p, i) =>
      i === 0 ? { ...p, shortName: 'Maria Consolacion', name: 'Maria Consolacion Villareal' } : p,
    ),
  },
}
export const Phone: Story = {
  decorators: [
    (Story) => (
      <div className="w-full">
        <Story />
      </div>
    ),
  ],
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = {
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
  globals: { viewport: { value: 'desktop' } },
}
