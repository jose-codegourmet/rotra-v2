import {
  type SessionRecordPlayerCard,
  sessionRecordFixture,
} from '@rotra/data/fixtures/session-record'
import { levelLabel } from '@rotra/ui/level-pill'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { RecordPlayerCard, type RecordPlayerCardProps } from './RecordPlayerCard'

const { minimumGames, playerCards } = sessionRecordFixture

/** The first Thursday Open Play card matching the predicate; falls back to the first card. */
const cardWhere = (test: (c: SessionRecordPlayerCard) => boolean) => {
  const card = playerCards.find(test) ?? playerCards[0]
  if (!card) throw new Error('No player cards in the session record fixture')
  return card
}

const propsFor = (
  card: SessionRecordPlayerCard,
  overrides: Partial<RecordPlayerCardProps> = {},
): RecordPlayerCardProps => ({
  player: { id: card.playerId, name: card.name },
  levelLabel: levelLabel(card.level),
  rank: card.rank ?? undefined,
  games: card.games,
  minimum: minimumGames,
  wins: card.wins,
  losses: card.losses,
  onSelectPlayer: fn(),
  ...overrides,
})

const meta = {
  title: 'Queue/RecordPlayerCard',
  component: RecordPlayerCard,
  decorators: [
    (Story) => (
      <div className="w-[180px]">
        <Story />
      </div>
    ),
  ],
  args: propsFor(cardWhere((c) => c.games > minimumGames)),
} satisfies Meta<typeof RecordPlayerCard>

export default meta
type Story = StoryObj<typeof meta>

/** More games than the minimum, with a top-three rank chip. */
export const Above: Story = {}

export const Met: Story = {
  args: propsFor(
    cardWhere((c) => c.games === minimumGames),
    { games: minimumGames },
  ),
}

/** Below the minimum: the warn chip says how many games short. */
export const Short: Story = {
  args: propsFor(
    cardWhere((c) => c.games < minimumGames),
    { games: minimumGames - 2 },
  ),
}

/** An invalid session: no rank, no stats, "Not counted". */
export const NotCounted: Story = {
  args: propsFor(
    cardWhere(() => true),
    { variant: 'not-counted', rank: undefined },
  ),
}

export const LongName: Story = {
  args: propsFor(
    cardWhere((c) => c.games > minimumGames),
    {
      player: { id: 'long-name', name: 'Maria Antonieta Villanueva-Santos de la Cruz' },
    },
  ),
}

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }

export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
