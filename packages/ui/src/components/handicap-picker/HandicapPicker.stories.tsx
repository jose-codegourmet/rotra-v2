import type { HandicapSpot } from '@rotra/data/session-roster/handicap'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { HandicapPicker } from './HandicapPicker'

function Live({ initial }: { initial: HandicapSpot[] }) {
  const [spots, setSpots] = useState(initial)
  return <HandicapPicker value={spots} onChange={setSpots} who="Dhin" />
}

const meta = {
  title: 'Queue/HandicapPicker',
  component: HandicapPicker,
  args: { value: [], onChange: () => {}, who: 'Dhin' },
  render: (args) => <Live initial={[...args.value]} />,
} satisfies Meta<typeof HandicapPicker>

export default meta
type Story = StoryObj<typeof meta>

export const NoHandicap: Story = {}
export const OneSpot: Story = { args: { value: ['left_knee'] } }
export const SeveralSpots: Story = {
  args: { value: ['left_knee', 'lower_back', 'right_shoulder', 'left_ankle'] },
}
export const Disabled: Story = {
  args: { value: ['lower_back'], disabled: true },
  render: (args) => <HandicapPicker {...args} />,
}
export const SeveralSpotsLight: Story = { ...SeveralSpots, globals: { theme: 'light' } }
