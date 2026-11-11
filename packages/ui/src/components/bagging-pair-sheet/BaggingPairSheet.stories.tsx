import { matchLineupFixtures } from '@rotra/data/fixtures/match-lineups'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'
import { BaggingPairSheet } from './BaggingPairSheet'

const fixture = matchLineupFixtures.bagging
const [first, second, third] = fixture.players

const meta = {
  title: 'Queue/BaggingPairSheet',
  component: BaggingPairSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    players: fixture.players,
    pairs: [],
    minimumGames: fixture.minimumGames,
    onAdd: fn(),
  },
} satisfies Meta<typeof BaggingPairSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Nothing picked: Add pair is disabled. */
export const Empty: Story = {}
export const OnePicked: Story = { args: { defaultSelection: { a: first?.id } } }
export const TwoPicked: Story = {
  args: { defaultSelection: { a: first?.id, b: second?.id, games: [1, 3] } },
}
/** A pick who is already paired: the warning and Replace pair. */
export const ReplacePair: Story = {
  args: { pairs: fixture.pairs, defaultSelection: { a: first?.id, b: third?.id } },
}
export const TooFewPresent: Story = { args: { players: fixture.players.slice(0, 1) } }
/** More than 24 present: Previous / Next and "Page 1 of 2". */
export const Paginated: Story = { args: { players: fixture.manyPlayers } }
export const Phone: Story = {
  args: { defaultSelection: { a: first?.id } },
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
/** Tap two players, then a third to swap the partner, then the first slot to clear it. */
export const TapToPair: Story = {
  play: async ({ userEvent }) => {
    const sheet = within(document.body)
    const tile = (name: string, picked?: 'first' | 'second') =>
      sheet.getByRole('button', {
        name: new RegExp(`^${name}, .*${picked ? `picked ${picked}$` : ''}`),
      })
    await userEvent.click(tile(first!.name))
    await userEvent.click(tile(second!.name))
    await expect(tile(second!.name, 'second')).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(tile(third!.name))
    await expect(tile(third!.name, 'second')).toHaveAttribute('aria-pressed', 'true')
    await expect(sheet.getByRole('button', { name: 'Add pair' })).toBeEnabled()
    await userEvent.click(
      sheet.getByRole('button', { name: `Selection 1: ${first!.name}. Tap to clear` }),
    )
    await expect(tile(third!.name, 'first')).toHaveAttribute('aria-pressed', 'true')
    await expect(sheet.getByRole('button', { name: 'Add pair' })).toBeDisabled()
  },
}
