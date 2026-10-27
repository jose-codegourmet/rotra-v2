import type { Meta, StoryObj } from '@storybook/react-vite'
import { Breadcrumb } from './Breadcrumb'

const meta = {
  title: 'Shared/Breadcrumb',
  component: Breadcrumb,
  args: { label: 'Home', onClick: () => {} },
} satisfies Meta<typeof Breadcrumb>

export default meta
type Story = StoryObj<typeof meta>

export const Home: Story = {}
export const BackToSetup: Story = { args: { label: 'Back to session setup' } }
export const AsLink: Story = { args: { label: 'Clubs', href: '#clubs', onClick: undefined } }
