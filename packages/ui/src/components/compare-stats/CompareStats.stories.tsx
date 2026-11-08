import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  againstGames,
  comparisonRows,
  longName,
  me,
  sharedGames,
  them,
} from '../shared-game-row/SharedGameRow.storyData'
import { CompareStats } from './CompareStats'

const meta = {
  title: 'Player/CompareStats',
  component: CompareStats,
  args: {
    me,
    them,
    filter: 'all',
    rows: comparisonRows('all'),
    games: sharedGames.length,
    myWins: sharedGames.filter((game) => game.meWon).length,
    otherWins: sharedGames.filter((game) => (game.together ? game.meWon : !game.meWon)).length,
  },
} satisfies Meta<typeof CompareStats>
export default meta
type Story = StoryObj<typeof meta>
export const All: Story = {}
export const HeadToHead: Story = {
  args: {
    filter: 'h2h',
    rows: comparisonRows('h2h'),
    games: againstGames.length,
    myWins: againstGames.filter((game) => game.meWon).length,
    otherWins: againstGames.filter((game) => !game.meWon).length,
  },
}
export const Empty: Story = {
  args: {
    games: 0,
    myWins: 0,
    otherWins: 0,
    rows: comparisonRows('all').map((row) =>
      ['Level', 'Overall position'].includes(row.label)
        ? row
        : {
            ...row,
            mine: row.label === 'Win rate in these games' ? '—' : 0,
            theirs: row.label === 'Win rate in these games' ? '—' : 0,
            lead: undefined,
          },
    ),
  },
}
export const EmptyHeadToHead: Story = {
  args: {
    ...Empty.args,
    filter: 'h2h',
    rows: comparisonRows('h2h').map((row) =>
      ['Level', 'Overall position', 'Games counted (3 months)', 'Win rate overall'].includes(
        row.label,
      )
        ? row
        : {
            ...row,
            mine: row.label === 'Win rate in these games' ? '—' : 0,
            theirs: row.label === 'Win rate in these games' ? '—' : 0,
            lead: undefined,
          },
    ),
  },
}
export const LongName: Story = { args: { them: longName } }
export const LeadValues: Story = {
  args: {
    rows: comparisonRows('all').map((row, index) => ({
      ...row,
      lead: index % 2 ? 'mine' : 'theirs',
    })),
  },
}
export const Light: Story = { globals: { theme: 'light' } }
export const HeadToHeadLight: Story = { ...HeadToHead, globals: { theme: 'light' } }
export const EmptyLight: Story = { ...Empty, globals: { theme: 'light' } }
export const EmptyHeadToHeadLight: Story = { ...EmptyHeadToHead, globals: { theme: 'light' } }
export const LongNameLight: Story = { ...LongName, globals: { theme: 'light' } }
export const LeadValuesLight: Story = { ...LeadValues, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
