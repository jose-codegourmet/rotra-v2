import type { Meta, StoryObj } from '@storybook/react-vite'
import { KeyValueList } from './KeyValueList'

const meta = {
  title: 'Shared/KeyValueList',
  component: KeyValueList,
  args: {
    items: [
      { label: 'Venue', value: 'RK Sports Center' },
      { label: 'Address', value: 'Lapu-Lapu City, Cebu' },
      { label: 'Time', value: '6:00 PM – 9:00 PM' },
      { label: 'Courts', value: 'Court 1, Court 2, Court 3' },
      { label: 'RTR ID', value: <span className="font-mono">RTR-PH-CEB-031526-0001</span> },
    ],
  },
} satisfies Meta<typeof KeyValueList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
