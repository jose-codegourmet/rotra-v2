import { profileLeaderboardStoryPlaces } from '@rotra/data/fixtures/rank-states'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProfileLeaderboardChips } from './ProfileLeaderboardChips'

const meta = {
  title: 'Player/ProfileLeaderboardChips',
  component: ProfileLeaderboardChips,
  args: {
    places: profileLeaderboardStoryPlaces,
  },
  decorators: [
    (Story) => (
      <div className="flex flex-wrap gap-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileLeaderboardChips>
export default meta
type Story = StoryObj<typeof meta>

export const ThreePlaces: Story = {}
export const OnePlace: Story = { args: { places: meta.args.places.slice(0, 1) } }
export const NoPlaces: Story = { args: { places: [] } }
