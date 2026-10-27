import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { SessionDefaultsPanel } from './SessionDefaultsPanel'

// Queue prototype defaults: 8 players per court; ₱60 entrance fee in the "with fee" state.
const meta = {
  title: 'Queue/SessionDefaultsPanel',
  component: SessionDefaultsPanel,
  decorators: [
    (Story) => (
      <div className="max-w-[820px]">
        <Story />
      </div>
    ),
  ],
  args: {
    playersPerCourt: 8,
    onPlayersPerCourtChange: fn(),
    entranceFeeMinor: null,
    onSaveEntranceFee: fn(),
    onClearEntranceFee: fn(),
  },
} satisfies Meta<typeof SessionDefaultsPanel>

export default meta
type Story = StoryObj<typeof meta>

export const WithoutEntranceFee: Story = {
  render: (args) => {
    const [perCourt, setPerCourt] = useState(args.playersPerCourt)
    return (
      <SessionDefaultsPanel
        {...args}
        playersPerCourt={perCourt}
        onPlayersPerCourtChange={setPerCourt}
      />
    )
  },
}
export const WithEntranceFee: Story = { args: { entranceFeeMinor: 6000 } }

/** Clear the amount and press Save to see "Enter an amount, 0 or more." */
export const FeeError: Story = { args: { entranceFeeMinor: 6000 } }
export const Phone: Story = {
  args: { entranceFeeMinor: 6000 },
  globals: { viewport: { value: 'phone' } },
}
