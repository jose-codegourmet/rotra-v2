import { playerProfileScenarios } from '@rotra/data/fixtures/player-profiles'
import type { CompareFilter } from '@rotra/ui/compare-filter-bar'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { SharedGameRow, SharedGamesList } from './SharedGameRow'
import { againstGames, sharedGames, them, togetherGames } from './SharedGameRow.storyData'

const against = againstGames[0]
const together = togetherGames[0]
if (!against || !together) throw new Error('Missing shared-game story fixture.')
const meta = {
  title: 'Player/SharedGameRow',
  component: SharedGameRow,
  args: { game: against },
} satisfies Meta<typeof SharedGameRow>
export default meta
type Story = StoryObj<typeof meta>
export const AgainstWon: Story = {
  args: { game: againstGames.find((game) => game.meWon) ?? against },
}
export const AgainstLost: Story = {
  args: { game: againstGames.find((game) => !game.meWon) ?? against },
}
export const TogetherWon: Story = {
  args: { game: togetherGames.find((game) => game.meWon) ?? together },
}
export const TogetherLost: Story = {
  args: { game: togetherGames.find((game) => !game.meWon) ?? together },
}
export const Singles: Story = {
  args: {
    game: {
      ...against,
      mine: against.mine.slice(0, 1),
      theirs: against.theirs.filter((player) => player.name === them.name),
    },
  },
}
export const NoScore: Story = { args: { game: { ...against, score: null } } }
export const LongNames: Story = {
  args: {
    game: {
      ...against,
      otherName: playerProfileScenarios.longNames.fullName,
      theirs: against.theirs.map((player) => ({
        ...player,
        label: playerProfileScenarios.longNames.fullName,
      })),
    },
  },
}
export const Initials: Story = {
  args: {
    game: {
      ...against,
      mine: against.mine.map((player) => ({ ...player, pictureUrl: null })),
      theirs: against.theirs.map((player) => ({ ...player, pictureUrl: null })),
    },
  },
}

// Repeat existing fixture rows to demonstrate a middle page (4–6 of 8) without seeding new results.
const pagingGames = [...sharedGames, ...sharedGames].map((game, index) => ({
  ...game,
  id: `${game.id}-paging-${index}`,
}))
function PagingExample({ initialPage = 0 }: { initialPage?: number }) {
  const [page, setPage] = useState(initialPage)
  return (
    <SharedGamesList
      games={pagingGames.slice(page * 3, (page + 1) * 3)}
      total={pagingGames.length}
      page={page}
      filter="all"
      otherName={them.name}
      onPageChange={setPage}
    />
  )
}
function EmptyExample({ filter }: { filter: CompareFilter }) {
  return (
    <SharedGamesList
      games={[]}
      total={0}
      page={0}
      filter={filter}
      otherName={them.name}
      onPageChange={() => {}}
    />
  )
}
export const Paging: Story = { render: () => <PagingExample /> }
export const MiddlePage: Story = { render: () => <PagingExample initialPage={1} /> }
export const OldestPage: Story = { render: () => <PagingExample initialPage={2} /> }
export const Empty: Story = { render: () => <EmptyExample filter="all" /> }
export const EmptyHeadToHead: Story = { render: () => <EmptyExample filter="h2h" /> }
export const EmptyTogether: Story = { render: () => <EmptyExample filter="together" /> }
export const OnePage: Story = {
  render: () => (
    <SharedGamesList
      games={togetherGames}
      total={togetherGames.length}
      page={0}
      filter="together"
      otherName={them.name}
      onPageChange={() => {}}
    />
  ),
}
export const Light: Story = { globals: { theme: 'light' } }
export const AgainstLostLight: Story = { ...AgainstLost, globals: { theme: 'light' } }
export const TogetherWonLight: Story = { ...TogetherWon, globals: { theme: 'light' } }
export const TogetherLostLight: Story = { ...TogetherLost, globals: { theme: 'light' } }
export const SinglesLight: Story = { ...Singles, globals: { theme: 'light' } }
export const NoScoreLight: Story = { ...NoScore, globals: { theme: 'light' } }
export const LongNamesLight: Story = { ...LongNames, globals: { theme: 'light' } }
export const InitialsLight: Story = { ...Initials, globals: { theme: 'light' } }
export const PagingLight: Story = { ...Paging, globals: { theme: 'light' } }
export const MiddlePageLight: Story = { ...MiddlePage, globals: { theme: 'light' } }
export const OldestPageLight: Story = { ...OldestPage, globals: { theme: 'light' } }
export const EmptyLight: Story = { ...Empty, globals: { theme: 'light' } }
export const EmptyHeadToHeadLight: Story = { ...EmptyHeadToHead, globals: { theme: 'light' } }
export const EmptyTogetherLight: Story = { ...EmptyTogether, globals: { theme: 'light' } }
export const OnePageLight: Story = { ...OnePage, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
