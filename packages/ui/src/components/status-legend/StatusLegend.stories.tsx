import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatusLegend } from './StatusLegend'

const meta = {
  title: 'Queue/StatusLegend',
  component: StatusLegend,
} satisfies Meta<typeof StatusLegend>

export default meta
type Story = StoryObj<typeof meta>

export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const DesktopLight: Story = {
  globals: { theme: 'light', viewport: { value: 'desktop' } },
}
/** At 375 px the keys wrap onto a second line */
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const PhoneLight: Story = { globals: { theme: 'light', viewport: { value: 'phone' } } }
