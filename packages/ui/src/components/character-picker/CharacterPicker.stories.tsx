import { profileCharacterUrl } from '@rotra/ui/profile-picture'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { CharacterPicker } from './CharacterPicker'

// 24 characters: page 1 is full (15), page 2 has fewer (9).
const characters = ['', ...'abcdefghijklmnopqrstuvw'].map((id) => ({
  id,
  image: profileCharacterUrl('u1', 'Miguel Santos', id),
}))

const meta = {
  title: 'Player/CharacterPicker',
  component: CharacterPicker,
  args: { characters, name: 'Miguel Santos', selectedId: 'c', onSelect: fn() },
  decorators: [(Story) => <div className="mx-auto max-w-[520px]">{Story()}</div>],
} satisfies Meta<typeof CharacterPicker>
export default meta
type Story = StoryObj<typeof meta>

export const ChosenOnPageOne: Story = {}
export const ChosenOnPageOneLight: Story = { globals: { theme: 'light' } }
/** Opens on page 2, which has fewer than 15 */
export const LastPageFewer: Story = { args: { selectedId: 'u' } }
export const LastPageFewerLight: Story = { args: { selectedId: 'u' }, globals: { theme: 'light' } }
export const NoneChosen: Story = { args: { selectedId: null } }
export const Disabled: Story = { args: { disabled: true } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { viewport: { value: 'phone' }, theme: 'light' } }
export const Interactive: Story = {
  render: (args) => {
    const [selected, setSelected] = useState<string | null>('c')
    return <CharacterPicker {...args} selectedId={selected} onSelect={setSelected} />
  },
}
