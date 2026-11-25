import type { Meta, StoryObj } from '@storybook/react-vite'
import { PairFaces } from './PairFaces'

const meta = {
  title: 'Queue/PairFaces',
  component: PairFaces,
  args: {
    players: [
      { name: 'Danna Reyes', shortName: 'Danna', level: 'beginner_mid' },
      { name: 'Darryn Lim', shortName: 'Darryn', level: 'intermediate_mid' },
    ],
  },
} satisfies Meta<typeof PairFaces>

export default meta
type Story = StoryObj<typeof meta>

export const Doubles: Story = {}
export const Singles: Story = {
  args: { players: [{ name: 'Derr Santos', shortName: 'Derr', level: null }] },
}
export const ThreePlayers: Story = {
  args: {
    players: [
      { name: 'Carlo Cruz', shortName: 'Carlo', level: 'advanced_low' },
      { name: 'Miguel Santos', shortName: 'Kuya Migs', level: 'intermediate_high' },
      { name: 'Pau Dizon', shortName: 'Pau', level: 'beginner_high' },
    ],
  },
}
export const Light: Story = { globals: { theme: 'light' } }
