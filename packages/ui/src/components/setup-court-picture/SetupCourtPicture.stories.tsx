import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { SetupCourtPicture, SetupCourtPictureGrid } from './SetupCourtPicture'

const meta = {
  title: 'Queue/SetupCourtPicture',
  component: SetupCourtPicture,
  decorators: [
    (Story) => (
      <div className="w-full max-w-[360px]">
        <Story />
      </div>
    ),
  ],
  args: { label: 'Court 1', players: 8, onPress: fn() },
} satisfies Meta<typeof SetupCourtPicture>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const CustomTimes: Story = {
  args: { label: 'Court 2', plannedStart: '7:30 PM', plannedEnd: '9:30 PM' },
}
export const TimeError: Story = {
  args: { label: 'Court 3', plannedStart: '6:00 PM', plannedEnd: '10:30 PM', invalid: true },
}
export const Grid: Story = {
  decorators: [
    (Story) => (
      <div className="w-full max-w-[760px]">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <SetupCourtPictureGrid>
      <SetupCourtPicture {...args} label="Court 1" />
      <SetupCourtPicture {...args} label="Court 2" plannedStart="7:30 PM" plannedEnd="9:30 PM" />
      <SetupCourtPicture {...args} label="Court 3" invalid plannedEnd="11:00 PM" />
    </SetupCourtPictureGrid>
  ),
}
export const Dark: Story = { globals: { theme: 'dark' } }
export const Light: Story = { globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
