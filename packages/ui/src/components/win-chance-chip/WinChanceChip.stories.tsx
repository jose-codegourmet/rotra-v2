import type { Meta, StoryObj } from '@storybook/react-vite'
import { WinChanceChip } from './WinChanceChip'

const meta = {
  title: 'Queue/WinChanceChip',
  component: WinChanceChip,
  args: {
    chance: { a: 39, b: 61, favored: 'B', strong: false },
    teamNames: { a: 'Pau and Ysa', b: 'Marco and Iya' },
  },
} satisfies Meta<typeof WinChanceChip>

export default meta
type Story = StoryObj<typeof meta>

/** Court cards: both pairs in one chip, left pair first. */
export const BothPairs: Story = {}
export const WeakerPair: Story = { args: { team: 'A' } }
export const StrongerPair: Story = { args: { team: 'B' } }
export const Favored: Story = {
  args: { team: 'B', chance: { a: 29, b: 71, favored: 'B', strong: true } },
}
export const Even: Story = {
  args: { team: 'A', chance: { a: 52, b: 48, favored: null, strong: false } },
}
/** With onOpen the chip is a button that opens the explanation dialog. */
export const Clickable: Story = { args: { team: 'B', onOpen: () => {} } }
export const ClickableBothPairs: Story = { args: { onOpen: () => {} } }
export const Light: Story = { globals: { theme: 'light' } }
