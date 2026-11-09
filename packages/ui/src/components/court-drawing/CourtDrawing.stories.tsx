import {
  consoleSessionFixture,
  mergedConsoleSessionFixture,
} from '@rotra/data/fixtures/consoleSessions'
import { countedGames, shortName } from '@rotra/data/match/match.rules'
import type { Match } from '@rotra/data/match/types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ComponentProps } from 'react'
import { fn } from 'storybook/test'
import { CourtDrawing, type CourtPlayer } from './CourtDrawing'

const WIDTHS = [222, 360, 560] as const
const { roster, matches, session } = consoleSessionFixture
const playerOf = (id: string, source: Match[] = matches): CourtPlayer => {
  const p = roster.find((x) => x.id === id)
  if (!p) throw new Error('Roster fixture missing')
  return {
    id: p.id,
    name: p.nameSnapshot,
    shortName: shortName(p),
    level: p.level,
    games: countedGames(p.id, source),
  }
}
const teamsOf = (m: Match | undefined, source: Match[] = matches) => {
  if (!m) throw new Error('Match fixture missing')
  return {
    teamA: m.teamA.map((id) => playerOf(id, source)),
    teamB: m.teamB.map((id) => playerOf(id, source)),
  }
}
const doubles = teamsOf(matches[0])
const merged = teamsOf(mergedConsoleSessionFixture.matches[0], mergedConsoleSessionFixture.matches)
const minimumGames = session.minimumGames

function AtWidths(props: ComponentProps<typeof CourtDrawing>) {
  return (
    <div className="flex flex-col gap-6">
      {WIDTHS.map((width) => (
        <div key={width} className="flex flex-col gap-1.5">
          <p className="m-0 font-mono text-xs text-fg2 tabular-nums">{width} px</p>
          <div style={{ width }}>
            <CourtDrawing {...props} />
          </div>
        </div>
      ))}
    </div>
  )
}

const meta = {
  title: 'Queue/CourtDrawing',
  component: CourtDrawing,
  args: { ...doubles, minimumGames, onOpenProfile: fn(), showLevels: true },
} satisfies Meta<typeof CourtDrawing>

export default meta
type Story = StoryObj<typeof meta>

export const Doubles: Story = {
  render: (args) => <AtWidths {...args} />,
}
export const Singles: Story = {
  args: { teamA: doubles.teamA.slice(0, 1), teamB: doubles.teamB.slice(0, 1) },
  render: (args) => <AtWidths {...args} />,
}
export const OneVersusTwo: Story = {
  args: { teamA: doubles.teamA.slice(0, 1) },
  render: (args) => <AtWidths {...args} />,
}
export const ThreeVersusThree: Story = {
  args: { teamA: merged.teamA.slice(0, 3), teamB: merged.teamB.slice(0, 3) },
  render: (args) => <AtWidths {...args} />,
}
export const FourVersusFour: Story = {
  args: {
    teamA: merged.teamA.slice(0, 4),
    teamB: merged.teamB.slice(0, 4),
    tall: true,
    showLevels: true,
  },
  render: (args) => <AtWidths {...args} />,
}
export const FiveVersusFiveMerged: Story = {
  args: { ...merged, courts: 2 },
  render: (args) => <AtWidths {...args} />,
}
export const Free: Story = {
  args: { free: true, teamA: [], teamB: [] },
  render: (args) => <AtWidths {...args} />,
}
export const LongNames: Story = {
  args: {
    teamA: doubles.teamA.map((p, i) =>
      i === 0 ? { ...p, shortName: 'Maria Consolacion', name: 'Maria Consolacion Villareal' } : p,
    ),
  },
  render: (args) => <AtWidths {...args} />,
}
export const NarrowestCard: Story = {
  decorators: [
    (Story) => (
      <div className="w-[222px]">
        <Story />
      </div>
    ),
  ],
}
export const Phone: Story = {
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = {
  decorators: [
    (Story) => (
      <div className="w-[560px]">
        <Story />
      </div>
    ),
  ],
  globals: { viewport: { value: 'desktop' } },
}

export const LevelsAndUnassigned: Story = {
  args: {
    showLevels: true,
    teamA: doubles.teamA.map((p, i) => (i === 0 ? { ...p, level: null } : p)),
  },
  render: (args) => <AtWidths {...args} />,
}

/** Confirmation layout: one stretched court, distinct from two merged courts. */
export const FiveVersusFiveTall: Story = {
  args: { ...merged, tall: true },
  render: (args) => <AtWidths {...args} />,
}

/** Game-count badges remain announced without a supplied session minimum. */
export const GamesWithoutMinimum: Story = { args: { minimumGames: undefined } }

/** All prototype skill-label tints, including the unassigned white label. */
export const LevelBands: Story = {
  args: {
    teamA: doubles.teamA.map<CourtPlayer>((player, i) => ({
      ...player,
      level: i === 0 ? 'beginner_low' : 'intermediate_mid',
    })),
    teamB: doubles.teamB.map<CourtPlayer>((player, i) => ({
      ...player,
      level: i === 0 ? 'advanced_low' : null,
    })),
    showLevels: true,
  },
}
export const LevelBandsLight: Story = { ...LevelBands, globals: { theme: 'light' } }
