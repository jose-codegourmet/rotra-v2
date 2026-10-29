import { adminClubRows } from '@rotra/data/fixtures/admin-clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ClubCell } from './ClubCell'

const lahug = adminClubRows[0]
const itPark = adminClubRows[1]
const sampaloc = adminClubRows[3]
if (!lahug || !itPark || !sampaloc) throw new Error('Club fixtures missing')

const meta = {
  title: 'Admin/ClubCell',
  component: ClubCell,
  args: {
    name: itPark.name,
    initials: itPark.initials,
    logoUrl: itPark.logoUrl,
    username: itPark.username,
    href: `/clubs/${itPark.id}`,
  },
  decorators: [
    (Story) => (
      <div className="max-w-[320px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ClubCell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Running: Story = {
  args: {
    name: lahug.name,
    initials: lahug.initials,
    accent: lahug.accent,
    username: lahug.username,
    href: `/clubs/${lahug.id}`,
    runningSessionTitle: lahug.runningSessionTitle,
    hasNameRequest: lahug.nameRequest !== null,
  },
}
export const NameRequested: Story = {
  args: {
    name: sampaloc.name,
    initials: sampaloc.initials,
    username: sampaloc.username,
    href: `/clubs/${sampaloc.id}`,
    hasNameRequest: sampaloc.nameRequest !== null,
  },
}
export const LongName: Story = {
  args: {
    name: 'Lahug Smash and Shuttle Badminton Association of Cebu',
    username: 'lahug.smash.and.shuttle.badminton.association',
    runningSessionTitle: 'Tuesday Night Queue for Intermediate and Advanced Players',
    hasNameRequest: true,
  },
  globals: { viewport: { value: 'phone' } },
}
export const AsButton: Story = { args: { href: undefined, onOpen: fn() } }
export const Phone: Story = { args: Running.args, globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { args: Running.args, globals: { viewport: { value: 'desktop' } } }
export const Light: Story = { args: Running.args, globals: { theme: 'light' } }
