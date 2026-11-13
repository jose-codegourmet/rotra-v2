import type { Meta, StoryObj } from '@storybook/react-vite'
import { RankShareCard } from './RankShareCard'

const meta = {
  title: 'Player/RankShareCard',
  component: RankShareCard,
  args: {
    webShare: false,
    link: 'https://players.rotra.example/players/u1',
    name: 'Miguel Santos',
    nickname: 'Migs',
    level: 6,
    levelLabel: 'Intermediate High',
    position: 214,
    onCopy: () => {},
  },
} satisfies Meta<typeof RankShareCard>
export default meta
type Story = StoryObj<typeof meta>
export const AllSizes: Story = { args: {} }
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const NoPosition: Story = { args: { position: null } }
export const WebShare: Story = { args: { webShare: true } }
