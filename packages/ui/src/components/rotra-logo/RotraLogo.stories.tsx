import type { Meta, StoryObj } from '@storybook/react-vite'
import { RotraLogo } from './RotraLogo'

const meta = {
  title: 'Shared/RotraLogo',
  component: RotraLogo,
  args: { variant: 'full', tone: 'theme' },
} satisfies Meta<typeof RotraLogo>
export default meta
type Story = StoryObj<typeof meta>

export const TopBarFull: Story = { globals: { theme: 'dark' } }
export const TopBarFullLight: Story = { globals: { theme: 'light' } }
export const Mini: Story = { args: { variant: 'mini' }, globals: { theme: 'dark' } }
export const MiniLight: Story = { args: { variant: 'mini' }, globals: { theme: 'light' } }
export const Responsive: Story = { args: { variant: 'responsive' }, globals: { theme: 'dark' } }
export const ResponsivePhone: Story = {
  args: { variant: 'responsive' },
  globals: { theme: 'dark', viewport: { value: 'phone' } },
}
export const ResponsivePhoneLight: Story = {
  args: { variant: 'responsive' },
  globals: { theme: 'light', viewport: { value: 'phone' } },
}
export const SignIn: Story = { args: { className: 'h-[52px]' }, globals: { theme: 'dark' } }
export const SignInLight: Story = { args: { className: 'h-[52px]' }, globals: { theme: 'light' } }
/** Share images and the Session QR card: always the Dark BG artwork, on the fixed dark card. */
export const FixedDark: Story = {
  args: { tone: 'dark', className: 'h-5' },
  decorators: [(Story) => <div className="inline-block rounded-lg bg-share-bg p-4">{Story()}</div>],
  globals: { theme: 'dark' },
}
export const FixedDarkLight: Story = {
  args: { tone: 'dark', className: 'h-5' },
  decorators: [(Story) => <div className="inline-block rounded-lg bg-share-bg p-4">{Story()}</div>],
  globals: { theme: 'light' },
}
