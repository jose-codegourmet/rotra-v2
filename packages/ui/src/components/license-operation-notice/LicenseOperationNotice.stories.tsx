import { clubs } from '@rotra/data/fixtures/clubs'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { LicenseOperationNotice } from './LicenseOperationNotice'

const lahug = clubs.find((club) => club.username === 'lahug.smash')
if (!lahug) throw new Error('Club fixtures missing')

const meta = {
  title: 'Admin/LicenseOperationNotice',
  component: LicenseOperationNotice,
  args: { verb: 'Renew', clubName: lahug.name, onCheck: fn() },
} satisfies Meta<typeof LicenseOperationNotice>

export default meta
type Story = StoryObj<typeof meta>

export const Timeout: Story = {}
export const Checking: Story = { args: { isChecking: true } }
export const Activation: Story = { args: { verb: 'Activate', clubName: 'Banilad Smash Club' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Desktop: Story = { globals: { viewport: { value: 'desktop' } } }
export const TimeoutLight: Story = { globals: { theme: 'light' } }
export const CheckingLight: Story = { ...Checking, globals: { theme: 'light' } }
