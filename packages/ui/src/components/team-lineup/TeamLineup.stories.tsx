import type { MatchLineupFixture } from '@rotra/data/fixtures/match-lineups'
import { matchLineupFixtures } from '@rotra/data/fixtures/match-lineups'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { TeamLineup, type TeamLineupProps } from './TeamLineup'

const propsFor = (l: MatchLineupFixture): TeamLineupProps => ({
  teamA: l.teamA,
  teamB: l.teamB,
  minimumGames: l.minimumGames,
  onSelectPlayer: fn(),
})

const meta = {
  title: 'Queue/TeamLineup',
  component: TeamLineup,
  decorators: [
    (Story) => (
      <div className="w-[520px] max-w-full">
        <Story />
      </div>
    ),
  ],
  args: propsFor(matchLineupFixtures.belowMinimum),
} satisfies Meta<typeof TeamLineup>

export default meta
type Story = StoryObj<typeof meta>

export const Doubles: Story = {}
export const Singles: Story = { args: propsFor(matchLineupFixtures.singles) }
export const EveryoneMetMinimum: Story = { args: propsFor(matchLineupFixtures.everyoneMet) }
export const LongNames: Story = { args: propsFor(matchLineupFixtures.longNames) }

function SwappableDemo(args: TeamLineupProps) {
  const [teams, setTeams] = useState({ teamA: args.teamA, teamB: args.teamB })
  return (
    <TeamLineup
      {...args}
      teamA={teams.teamA}
      teamB={teams.teamB}
      onSwap={(from, to) => {
        args.onSwap?.(from, to)
        setTeams((prev) => {
          const next = { teamA: [...prev.teamA], teamB: [...prev.teamB] }
          const a = from.team === 'A' ? next.teamA : next.teamB
          const b = to.team === 'A' ? next.teamA : next.teamB
          const x = a[from.index],
            y = b[to.index]
          if (!x || !y) return prev
          a[from.index] = y
          b[to.index] = x
          return next
        })
      }}
    />
  )
}

/** Drag a player onto someone on the other team, or focus a card and press ← / →. */
export const Swappable: Story = {
  args: { onSwap: fn() },
  render: (args) => <SwappableDemo {...args} />,
}

export const Phone: Story = {
  decorators: [
    (Story) => (
      <div className="w-[335px]">
        <Story />
      </div>
    ),
  ],
  args: propsFor(matchLineupFixtures.longNames),
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
