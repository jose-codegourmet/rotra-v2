import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { FavoritePlayerChips } from './FavoritePlayerChips'

const meta = {
  title: 'Player/FavoritePlayerChips',
  component: FavoritePlayerChips,
  args: { value: '', otherName: '', onChange: () => {}, onOtherNameChange: () => {} },
  render: (args) => {
    const [value, setValue] = useState(args.value)
    const [name, setName] = useState(args.otherName)
    return (
      <FavoritePlayerChips
        {...args}
        value={value}
        onChange={setValue}
        otherName={name}
        onOtherNameChange={setName}
      />
    )
  },
} satisfies Meta<typeof FavoritePlayerChips>

export default meta
type Story = StoryObj<typeof meta>

export const NothingPicked: Story = {}
export const PlayerPicked: Story = { args: { value: 'axelsen' } }
export const OthersWithName: Story = { args: { value: 'other', otherName: 'Rexy Mainaky' } }
export const OthersNoName: Story = {
  args: { value: 'other', error: "Type the player's name, or pick another answer." },
}
export const PlayerPickedLight: Story = { ...PlayerPicked, globals: { theme: 'light' } }
export const OthersWithNameLight: Story = { ...OthersWithName, globals: { theme: 'light' } }
export const Phone: Story = { ...OthersWithName, globals: { viewport: { value: 'phone' } } }
