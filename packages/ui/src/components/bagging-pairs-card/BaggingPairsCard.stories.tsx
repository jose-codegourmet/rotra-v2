import { matchLineupFixtures } from '@rotra/data/fixtures/match-lineups'
import { toggleBaggingGame } from '@rotra/data/match/auto-queue-rules'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { BaggingPairsCard, type BaggingPairsCardProps } from './BaggingPairsCard'

const fixture = matchLineupFixtures.bagging

function Demo(args: BaggingPairsCardProps) {
  const [pairs, setPairs] = useState(args.pairs)
  return (
    <BaggingPairsCard
      {...args}
      pairs={pairs}
      onToggleGame={(pairId, value) => {
        args.onToggleGame(pairId, value)
        setPairs((current) =>
          current.map((pair) =>
            pair.id === pairId
              ? { ...pair, games: toggleBaggingGame(pair.games, value, args.minimumGames) }
              : pair,
          ),
        )
      }}
      onRemove={(pairId) => {
        args.onRemove(pairId)
        setPairs((current) => current.filter((pair) => pair.id !== pairId))
      }}
    />
  )
}

const meta = {
  title: 'Queue/BaggingPairsCard',
  component: BaggingPairsCard,
  args: {
    pairs: fixture.pairs,
    minimumGames: fixture.minimumGames,
    onAddPair: fn(),
    onToggleGame: fn(),
    onRemove: fn(),
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof BaggingPairsCard>

export default meta
type Story = StoryObj<typeof meta>

/** Two pairs: one on ALL, one on games 1 and 3. */
export const WithPairs: Story = {}
export const Empty: Story = { args: { pairs: [] } }
export const EveryPattern: Story = {
  args: {
    pairs: [
      fixture.pairs[0]!,
      { ...fixture.pairs[1]!, games: [1, 3] },
      { ...fixture.pairs[2]!, games: [2, 4] },
      { ...fixture.pairs[3]!, games: [4] },
    ],
  },
}
export const MinimumOfFive: Story = { args: { minimumGames: 5 } }
export const Disabled: Story = { args: { disabled: true } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
