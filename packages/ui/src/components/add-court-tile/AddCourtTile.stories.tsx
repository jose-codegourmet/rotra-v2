import { consoleSessionFixture } from '@rotra/data/fixtures/consoleSessions'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { AddCourtTile } from './AddCourtTile'

const meta = {
  title: 'Queue/AddCourtTile',
  component: AddCourtTile,
  decorators: [
    (Story) => (
      <div className="w-full max-w-[250px]">
        <Story />
      </div>
    ),
  ],
  args: { nextNumber: consoleSessionFixture.courts.length + 1, onAdd: fn() },
} satisfies Meta<typeof AddCourtTile>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const SecondCourt: Story = { args: { nextNumber: 2 } }
export const Phone: Story = {
  decorators: [
    (Story) => (
      <div className="w-full">
        <Story />
      </div>
    ),
  ],
  globals: { viewport: { value: 'phone' } },
}
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
