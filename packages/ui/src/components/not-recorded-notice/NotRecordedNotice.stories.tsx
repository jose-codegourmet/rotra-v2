import type { Meta, StoryObj } from '@storybook/react-vite'
import { NotRecordedNotice } from './NotRecordedNotice'

const meta = {
  title: 'Queue/NotRecordedNotice',
  component: NotRecordedNotice,
  args: { variant: 'results' },
  argTypes: { variant: { control: 'inline-radio', options: ['results', 'night'] } },
} satisfies Meta<typeof NotRecordedNotice>

export default meta
type Story = StoryObj<typeof meta>

export const Results: Story = {}

export const Night: Story = { args: { variant: 'night' } }

export const Light: Story = { globals: { theme: 'light' } }

export const Phone: Story = { globals: { viewport: { value: 'phone' } } }

export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
