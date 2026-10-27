import { clubPlayers } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { AlphabetIndex } from './AlphabetIndex'

// Letters that have saved players in the fixtures; the rest render disabled.
const available = [...new Set(clubPlayers.map((p) => p.fullName.charAt(0).toUpperCase()))]

const meta = {
  title: 'Queue/AlphabetIndex',
  component: AlphabetIndex,
  args: { available, onJump: fn() },
} satisfies Meta<typeof AlphabetIndex>

export default meta
type Story = StoryObj<typeof meta>

export const WithDisabledLetters: Story = {}
export const AllAvailable: Story = { args: { available: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'] } }
