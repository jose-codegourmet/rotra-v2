import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProfileNotFound } from './ProfileNotFound'

const meta = {
  title: 'Player/ProfileNotFound',
  component: ProfileNotFound,
  args: { id: 'RTR-PH-CEB-999999-9999' },
} satisfies Meta<typeof ProfileNotFound>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
