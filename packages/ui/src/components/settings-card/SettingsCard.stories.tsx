import { Button } from '@rotra/ui/button'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SettingsCard } from './SettingsCard'

const meta = {
  title: 'Queue/SettingsCard',
  component: SettingsCard,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  args: { title: 'Game rules' },
} satisfies Meta<typeof SettingsCard>

export default meta
type Story = StoryObj<typeof meta>

const rules = {
  title: 'Game rules',
  chip: 'Fixed after start',
  tiles: [
    { id: 'min', label: 'Minimum games each · calculated', value: '4', mono: true },
    { id: 'rec', label: 'Record games', value: 'On' },
  ],
  rows: [
    { label: 'Formats', value: 'Doubles, Singles' },
    { label: 'Mode', value: 'Fair', note: 'Mainly level-matched games, roughly 10% easy games.' },
    { label: 'Scoring', value: 'Rally to 21', note: 'Win by 2, cap at 30.' },
  ],
}
const players = {
  title: 'Players',
  tiles: [
    { id: 'conf', label: 'Confirmed', value: '18', mono: true },
    { id: 'pres', label: 'Present', value: '12', mono: true },
  ],
  rows: [{ label: 'Match requests', value: 'Doubles', note: 'Formats players can ask for' }],
  actions: (
    <>
      <Button size="sm">Add player</Button>
      <Button size="sm">Match requests · 2</Button>
    </>
  ),
}
const costs = {
  title: 'Costs',
  tiles: [
    { id: 'each', label: 'Each player pays', value: '₱150', mono: true },
    { id: 'total', label: 'Estimated total', value: '₱2,700', mono: true },
  ],
  rows: [
    { label: 'Break-even share', value: '₱140' },
    { label: 'Result', value: 'Covers court costs' },
  ],
  actions: <Button size="sm">Payments</Button>,
}

/** With the chip, tiles and rows. */
export const WithChip: Story = { args: rules }
export const WithoutChip: Story = { args: { ...rules, chip: undefined } }
export const WithHeaderAction: Story = {
  args: {
    ...rules,
    chip: undefined,
    title: 'Game rules',
    headerAction: <Button size="sm">Edit</Button>,
  },
}
export const Players: Story = { args: players }
export const Costs: Story = { args: costs }
export const NotesFilled: Story = {
  args: {
    title: 'Notes',
    children: <p className="m-0 text-[13px]">Bring your own shuttles. Court 3 has a loose net.</p>,
  },
}
export const NotesEmpty: Story = {
  args: {
    title: 'Notes',
    children: <p className="m-0 text-[13px] text-fg2">No notes for tonight.</p>,
  },
}
export const Light: Story = { args: rules, globals: { theme: 'light' } }

/** Game rules | Players, then Costs | Notes: even heights; one column at 760 px and narrower. */
export const EvenGrid: Story = {
  args: rules,
  decorators: [
    () => (
      <div className="grid grid-cols-2 items-stretch gap-3 max-[760px]:grid-cols-1">
        <SettingsCard {...rules} />
        <SettingsCard {...players} />
        <SettingsCard {...costs} />
        <SettingsCard title="Notes">
          <p className="m-0 text-[13px] text-fg2">No notes for tonight.</p>
        </SettingsCard>
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
}
export const EvenGridLight: Story = { ...EvenGrid, globals: { theme: 'light' } }
export const EvenGridPhone: Story = { ...EvenGrid, globals: { viewport: { value: 'phone' } } }
