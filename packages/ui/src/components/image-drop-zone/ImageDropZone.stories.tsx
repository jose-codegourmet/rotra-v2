import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ImageDropZone } from './ImageDropZone'

const meta = {
  title: 'Admin/ImageDropZone',
  component: ImageDropZone,
  args: { id: 'image-drop-zone', onFiles: () => {} },
} satisfies Meta<typeof ImageDropZone>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}
export const IdleLight: Story = { globals: { theme: 'light' } }
export const DraggingOver: Story = { args: { dragOver: true } }
export const DraggingOverLight: Story = { args: { dragOver: true }, globals: { theme: 'light' } }
export const Disabled: Story = { args: { disabled: true } }

export const Interactive: Story = {
  render: (args) => {
    const [names, setNames] = useState<string[]>([])
    return (
      <div className="flex max-w-xl flex-col gap-3">
        <ImageDropZone {...args} onFiles={(files) => setNames(files.map((f) => f.name))} />
        <p className="text-sm text-fg2">{names.length ? names.join(', ') : 'No files yet.'}</p>
      </div>
    )
  },
}
