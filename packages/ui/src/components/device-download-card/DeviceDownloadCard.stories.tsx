import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { DeviceDownloadCard } from './DeviceDownloadCard'

const meta = {
  title: 'Queue/DeviceDownloadCard',
  component: DeviceDownloadCard,
  decorators: [
    (Story) => (
      <div className="max-w-[480px]">
        <Story />
      </div>
    ),
  ],
  args: { state: 'none', onDownload: fn() },
} satisfies Meta<typeof DeviceDownloadCard>

export default meta
type Story = StoryObj<typeof meta>

export const NotDownloaded: Story = {}
export const Downloading: Story = { args: { state: 'downloading' } }
export const Ready: Story = { args: { state: 'ready' } }
export const Offline: Story = { args: { offline: true } }
export const PreviousCopyKept: Story = { args: { state: 'ready', snapshotAge: 'from 7:42 PM' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
