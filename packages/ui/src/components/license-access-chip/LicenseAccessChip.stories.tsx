import { clubAccessExamples } from '@rotra/data/fixtures/admin-clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LicenseAccessChip } from './LicenseAccessChip'

const meta = {
  title: 'Admin/LicenseAccessChip',
  component: LicenseAccessChip,
  args: { access: clubAccessExamples.active },
} satisfies Meta<typeof LicenseAccessChip>

export default meta
type Story = StoryObj<typeof meta>

export const Active: Story = {}
export const EndsSoon: Story = { args: { access: clubAccessExamples.endsSoon } }
export const EndsTomorrow: Story = { args: { access: clubAccessExamples.endsTomorrow } }
export const EndsToday: Story = { args: { access: clubAccessExamples.endsToday } }
export const Expired: Story = { args: { access: clubAccessExamples.expired } }
export const Scheduled: Story = { args: { access: clubAccessExamples.scheduled } }
export const None: Story = { args: { access: clubAccessExamples.none } }

const all = (
  <div className="flex flex-wrap gap-2">
    {Object.entries(clubAccessExamples).map(([key, access]) => (
      <LicenseAccessChip key={key} access={access} />
    ))}
  </div>
)
export const AllStates: Story = { render: () => all }
export const AllStatesLight: Story = { render: () => all, globals: { theme: 'light' } }
export const Phone: Story = { render: () => all, globals: { viewport: { value: 'phone' } } }
