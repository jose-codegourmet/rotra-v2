import type { Meta, StoryObj } from '@storybook/react-vite'
import { SessionJoinQr } from './SessionJoinQr'

const meta = {
  title: 'Queue/SessionJoinQr',
  component: SessionJoinQr,
  args: {
    link: 'https://rotra.example/s/tuesday-night-smash-4f2k',
    slug: 'tuesday-night-smash-4f2k',
    clubName: 'Smash Squad',
    whenLabel: 'Sat, Nov 8 · 7:00 PM–10:00 PM',
    venueName: 'Greenfield Sports Hall',
  },
  decorators: [(Story) => <div className="mx-auto max-w-[480px]">{Story()}</div>],
} satisfies Meta<typeof SessionJoinQr>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const LongNames: Story = {
  args: {
    clubName: 'Quezon City Weekend Warriors Badminton Club',
    venueName: 'Barangay Holy Spirit Covered Court, Commonwealth Avenue',
  },
}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
