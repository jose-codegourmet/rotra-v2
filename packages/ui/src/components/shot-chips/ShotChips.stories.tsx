import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ShotChips } from './ShotChips'

const meta = {
  title: 'Player/ShotChips',
  component: ShotChips,
  args: { value: [], ownShots: [], onChange: () => {}, onOwnShotsChange: () => {} },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    const [own, setOwn] = useState(args.ownShots)
    return (
      <ShotChips
        {...args}
        value={value}
        onChange={setValue}
        ownShots={own}
        onOwnShotsChange={setOwn}
      />
    )
  },
} satisfies Meta<typeof ShotChips>

export default meta
type Story = StoryObj<typeof meta>

export const OthersClosed: Story = { args: { value: ['smash', 'drop', 'clear'] } }
export const OthersOpen: Story = { args: { defaultOthersOpen: true, value: ['smash'] } }
export const WithOwnShots: Story = {
  args: { defaultOthersOpen: true, value: ['smash'], ownShots: ['Crosscourt drop', 'Flick serve'] },
}
/** Type "Smash" (or "smash") and press Add: That shot is already on the list. Empty and 25+ characters also show their errors. */
export const TryErrors: Story = { args: { defaultOthersOpen: true } }
export const SixOwnShots: Story = {
  args: {
    defaultOthersOpen: true,
    ownShots: [
      'Crosscourt drop',
      'Flick serve',
      'Tumble',
      'Half smash',
      'Reverse slice',
      'Hairpin',
    ],
  },
}
export const OthersOpenLight: Story = { ...OthersOpen, globals: { theme: 'light' } }
export const WithOwnShotsLight: Story = { ...WithOwnShots, globals: { theme: 'light' } }
export const Phone: Story = { ...WithOwnShots, globals: { viewport: { value: 'phone' } } }
