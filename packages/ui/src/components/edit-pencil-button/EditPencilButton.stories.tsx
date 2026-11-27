import type { Meta, StoryObj } from '@storybook/react-vite'
import { EditPencilButton } from './EditPencilButton'

const meta = {
  title: 'Queue/EditPencilButton',
  component: EditPencilButton,
  args: { name: 'Jom', onClick: () => {} },
} satisfies Meta<typeof EditPencilButton>

export default meta
type Story = StoryObj<typeof meta>

export const Inline: Story = {}

export const Floating: Story = { args: { floating: true } }
