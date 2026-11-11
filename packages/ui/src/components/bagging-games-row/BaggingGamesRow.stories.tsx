import { toggleBaggingGame } from '@rotra/data/match/auto-queue-rules'
import type { BaggingGames } from '@rotra/data/match/auto-queue-types'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { BaggingGamesRow, type BaggingGamesRowProps } from './BaggingGamesRow'

function Demo(args: BaggingGamesRowProps) {
  const [games, setGames] = useState<BaggingGames>(args.games)
  return (
    <BaggingGamesRow
      {...args}
      games={games}
      onToggle={(value) => {
        args.onToggle(value)
        setGames((current) => toggleBaggingGame(current, value, args.minimumGames))
      }}
    />
  )
}

const meta = {
  title: 'Queue/BaggingGamesRow',
  component: BaggingGamesRow,
  args: { games: 'all', minimumGames: 4, onToggle: fn(), 'aria-label': 'Games' },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof BaggingGamesRow>

export default meta
type Story = StoryObj<typeof meta>

export const All: Story = {}
export const SomeGames: Story = { args: { games: [1, 3] } }
export const MinimumOfFive: Story = { args: { games: [2, 5], minimumGames: 5 } }
export const MinimumOfOne: Story = { args: { minimumGames: 1 } }
export const Disabled: Story = { args: { games: [2], disabled: true } }
