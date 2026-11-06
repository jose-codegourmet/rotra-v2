import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShortOnPlayersBanner } from './ShortOnPlayersBanner'

const meta = {
  title: 'Queue/ShortOnPlayersBanner',
  component: ShortOnPlayersBanner,
  decorators: [
    (Story) => (
      <div className="w-full max-w-5xl">
        <Story />
      </div>
    ),
  ],
  // The prototype's example: 7 present, 2 open courts, doubles only.
  args: { present: 7, doublesCourts: 1, sitOut: 3 },
} satisfies Meta<typeof ShortOnPlayersBanner>

export default meta
type Story = StoryObj<typeof meta>

/** "7 players present: enough for 1 doubles court. 3 sit out each game." */
export const SomeSitOut: Story = {}
/** "1 sits out" reads singular */
export const OneSitsOut: Story = { args: { present: 9, doublesCourts: 2, sitOut: 1 } }
/** Doubles and singles both on: "enough for 1 doubles court and 1 singles court." */
export const DoublesAndSingles: Story = {
  args: { present: 6, doublesCourts: 1, singlesCourts: 1, sitOut: 0 },
}
/** No one left over: the second sentence is dropped */
export const NoneSitOut: Story = { args: { present: 8, doublesCourts: 2, sitOut: 0 } }
/** Too few for any game: "3 players present: not enough for a doubles game." */
export const NotEnoughForAGame: Story = {
  args: { present: 3, doublesCourts: 0, sitOut: 0 },
}
export const SinglesOnlyNotEnough: Story = {
  args: { present: 1, doublesCourts: 0, sitOut: 0, standardFormat: 'singles' },
}

export const SomeSitOutLight: Story = { ...SomeSitOut, globals: { theme: 'light' } }
export const DoublesAndSinglesLight: Story = {
  ...DoublesAndSingles,
  globals: { theme: 'light' },
}
export const NotEnoughForAGameLight: Story = {
  ...NotEnoughForAGame,
  globals: { theme: 'light' },
}
export const Phone: Story = { ...SomeSitOut, globals: { viewport: { value: 'phone' } } }
