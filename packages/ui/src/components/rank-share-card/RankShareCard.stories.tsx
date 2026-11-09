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
export const Post: Story = { args: {} }
export const Story: Story = { args: { initialFormat: 'story' } }
export const NoPosition: Story = { args: { position: null } }
export const WebShare: Story = { args: { webShare: true } }
