import { players } from '@rotra/data/fixtures/players'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CopyField } from './CopyField'

const player = players[0]!
const meta = {
  title: 'Shared/CopyField',
  component: CopyField,
  args: {
    label: 'Profile link',
    value: `https://player.rotra.example/players/${player.id}`,
    onCopy: () => {},
  },
  decorators: [(Story) => <div className="max-w-[480px]">{Story()}</div>],
} satisfies Meta<typeof CopyField>
export default meta
type Story = StoryObj<typeof meta>

export const ProfileLink: Story = { globals: { theme: 'dark' } }
export const ProfileLinkLight: Story = { globals: { theme: 'light' } }
export const SessionLink: Story = {
  args: { label: 'Session link', value: 'https://queue.rotra.example/s/thursday-open-play' },
  globals: { theme: 'dark' },
}
export const SessionLinkLight: Story = {
  args: { label: 'Session link', value: 'https://queue.rotra.example/s/thursday-open-play' },
  globals: { theme: 'light' },
}
export const LongLink: Story = {
  args: {
    label: 'Link',
    value: `https://player.rotra.example/players/${player.id}/games?session=${'x'.repeat(80)}`,
  },
  globals: { viewport: { value: 'phone' } },
}
