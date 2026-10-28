import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { UnrecoverableSessionPanel } from './UnrecoverableSessionPanel'
const meta = { title: 'Queue/UnrecoverableSessionPanel', component: UnrecoverableSessionPanel, args: { onContinueToInvalid: fn() } } satisfies Meta<typeof UnrecoverableSessionPanel>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
