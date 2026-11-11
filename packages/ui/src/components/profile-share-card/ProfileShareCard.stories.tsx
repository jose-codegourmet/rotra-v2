import { PlayerShareSheet } from '@rotra/ui/player-share-sheet'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProfileShareCard } from './ProfileShareCard'

const photo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%2300c2ff'/%3E%3Ccircle cx='32' cy='26' r='12' fill='%23fff'/%3E%3Cpath d='M10 64c2-18 14-24 22-24s20 6 22 24z' fill='%23fff'/%3E%3C/svg%3E"
const character =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23ffb347'/%3E%3Ccircle cx='24' cy='28' r='4'/%3E%3Ccircle cx='40' cy='28' r='4'/%3E%3Cpath d='M22 42q10 8 20 0' stroke='%23000' stroke-width='3' fill='none'/%3E%3C/svg%3E"

const meta = {
  title: 'Player/ProfileShareCard',
  component: ProfileShareCard,
  args: {
    webShare: false,
    link: 'https://players.rotra.example/players/u1',
    name: 'Miguel Santos',
    nickname: 'Migs',
    picture: photo,
    levelLabel: 'Intermediate High',
    position: 214,
    wins: 12,
    onCopy: () => {},
  },
  decorators: [
    (Story) => (
      <PlayerShareSheet open onOpenChange={() => {}} title="Share profile">
        <Story />
      </PlayerShareSheet>
    ),
  ],
} satisfies Meta<typeof ProfileShareCard>
export default meta
type Story = StoryObj<typeof meta>
export const Ranked: Story = {}
export const Story: Story = { args: { initialFormat: 'story' } }
export const RankedNoPosition: Story = { args: { position: null } }
export const NotRanked: Story = { args: { levelLabel: null, position: null } }
export const NoGames: Story = { args: { wins: null } }
export const Initials: Story = { args: { picture: null } }
export const Character: Story = { args: { picture: character } }
export const WebShare: Story = { args: { webShare: true } }
