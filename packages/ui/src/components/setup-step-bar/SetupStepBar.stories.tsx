import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SetupStepBar } from './SetupStepBar'

const LABELS = ['Date, venue and courts', 'Formats, mode and minimum', 'Costs and review']

const meta = {
  title: 'Queue/SetupStepBar',
  component: SetupStepBar,
  args: {
    steps: [
      { label: LABELS[0] ?? '', state: 'current' },
      { label: LABELS[1] ?? '', state: 'todo' },
      { label: LABELS[2] ?? '', state: 'todo' },
    ],
    onSelect: fn(),
  },
} satisfies Meta<typeof SetupStepBar>

export default meta
type Story = StoryObj<typeof meta>

export const NewSession: Story = {}
export const MixedStates: Story = {
  args: {
    steps: [
      { label: LABELS[0] ?? '', state: 'warn' },
      { label: LABELS[1] ?? '', state: 'current' },
      { label: LABELS[2] ?? '', state: 'done' },
    ],
  },
}
export const EditingAllDone: Story = {
  args: {
    steps: [
      { label: LABELS[0] ?? '', state: 'done' },
      { label: LABELS[1] ?? '', state: 'done' },
      { label: LABELS[2] ?? '', state: 'current' },
    ],
  },
}
export const Phone: Story = {
  args: MixedStates.args,
  globals: { viewport: { value: 'phone' } },
}
