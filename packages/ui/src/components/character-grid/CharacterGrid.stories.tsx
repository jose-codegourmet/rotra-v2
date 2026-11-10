import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { CharacterGrid, type CharacterGridItem } from './CharacterGrid'

// Placeholder faces for the stories: a flat tile whose hue follows its position.
const face = (n: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="hsl(${(n * 47) % 360} 60% 55%)"/><circle cx="50" cy="42" r="20" fill="hsl(${(n * 47) % 360} 60% 85%)"/><rect x="22" y="68" width="56" height="40" rx="20" fill="hsl(${(n * 47) % 360} 60% 85%)"/></svg>`,
  )}`

const makeItems = (count: number, hiddenEvery = 0): CharacterGridItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `ch${i + 1}`,
    src: face(i + 1),
    shown: hiddenEvery === 0 || (i + 1) % hiddenEvery !== 0,
  }))

const meta = {
  title: 'Admin/CharacterGrid',
  component: CharacterGrid,
  args: { items: makeItems(24), onToggle: () => {}, onDelete: () => {} },
} satisfies Meta<typeof CharacterGrid>

export default meta
type Story = StoryObj<typeof meta>

export const AllShown: Story = {}

export const SomeHidden: Story = { args: { items: makeItems(24, 4) } }
export const SomeHiddenLight: Story = {
  args: { items: makeItems(24, 4) },
  globals: { theme: 'light' },
}

export const Disabled: Story = { args: { items: makeItems(24, 4), disabled: true } }

export const Phone: Story = {
  args: { items: makeItems(24, 4) },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    (Story) => (
      <div className="w-[343px]">
        <Story />
      </div>
    ),
  ],
}

export const Interactive: Story = {
  render: () => {
    const [items, setItems] = useState(() => makeItems(24, 4))
    return (
      <CharacterGrid
        items={items}
        onToggle={(id) =>
          setItems((list) => list.map((c) => (c.id === id ? { ...c, shown: !c.shown } : c)))
        }
        onDelete={(id) => setItems((list) => list.filter((c) => c.id !== id))}
      />
    )
  },
}
