import type { StartMatchFixture } from '@rotra/data/fixtures/start-match'
import { startMatchFixtures } from '@rotra/data/fixtures/start-match'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { StartMatchSheet, type StartMatchSheetProps } from './StartMatchSheet'

const propsFor = (f: StartMatchFixture): StartMatchSheetProps => ({
  open: true,
  onOpenChange: fn(),
  match: { matchNo: f.matchNo, format: f.format, teamA: f.teamA, teamB: f.teamB },
  minimumGames: f.minimumGames,
  status: f.status,
  freeCourts: f.freeCourts,
  courtIds: f.selectedCourtIds,
  onCourtIdsChange: fn(),
  onSelectPlayer: fn(),
  onSwap: fn(),
  onBack: fn(),
  onStart: fn(),
})

/** Keeps the court choice and the switched sides so the sheet can be tried. */
function Demo(args: StartMatchSheetProps) {
  const [courtIds, setCourtIds] = useState(args.courtIds)
  const [teams, setTeams] = useState({ teamA: args.match.teamA, teamB: args.match.teamB })
  return (
    <StartMatchSheet
      {...args}
      match={{ ...args.match, ...teams }}
      courtIds={courtIds}
      onCourtIdsChange={(next) => {
        args.onCourtIdsChange(next)
        setCourtIds(next)
      }}
      onSwap={(from, to) => {
        args.onSwap(from, to)
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

const meta = {
  title: 'Queue/StartMatchSheet',
  component: StartMatchSheet,
  args: propsFor(startMatchFixtures.doublesReady),
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof StartMatchSheet>

export default meta
type Story = StoryObj<typeof meta>

/** A ready doubles with the opening court preselected. */
export const DoublesReady: Story = {}

/** A 1v2 fun game: the Fun game chip joins the format chip. */
export const FunOneVTwo: Story = { args: propsFor(startMatchFixtures.funOneVTwo) }

/** 5v5 takes two courts: both free courts are preselected. */
export const FiveVFiveTwoCourts: Story = { args: propsFor(startMatchFixtures.fiveVFive) }

/** A player is still on court: the reason shows and Start match stays disabled. */
export const Blocked: Story = { args: propsFor(startMatchFixtures.blocked) }

/** Opened from a queue card with no court chosen yet. */
export const NoCourtChosen: Story = { args: { courtIds: [] } }

/** The start is running: Start match cannot fire twice and the sheet cannot be dismissed. */
export const Pending: Story = { args: { isPending: true } }

/** The recheck found a change: the sheet stays open with the message. */
export const SomethingChanged: Story = {
  args: { message: 'Something changed. Review the match again.' },
}

export const Phone: Story = {
  args: propsFor(startMatchFixtures.fiveVFive),
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
