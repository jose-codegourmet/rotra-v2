import { SignOutSheet } from '@rotra/ui/sign-out-sheet'
import { Toaster, toast } from '@rotra/ui/toaster'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { fn } from 'storybook/test'
import { PlayerNav, PlayerNavDock } from './PlayerNav'

const noop = () => undefined

const meta = {
  title: 'Player/PlayerNav',
  component: PlayerNav,
  args: {
    signedIn: false,
    current: 'leaderboard',
    leaderboard: { onNavigate: noop },
    signIn: { onNavigate: noop },
    profile: { onNavigate: noop },
  },
} satisfies Meta<typeof PlayerNav>

export default meta
type Story = StoryObj<typeof meta>

export const SignedOutOnLeaderboard: Story = {}

export const SignedInOnMyProfile: Story = {
  args: { signedIn: true, current: 'profile' },
}

export const SignedInOnLeaderboard: Story = {
  args: { signedIn: true, current: 'leaderboard' },
}

export const Phone: Story = {
  ...SignedOutOnLeaderboard,
  globals: { viewport: { value: 'phone' } },
}

const phone = { viewport: { value: 'phone' } }
const light = { theme: 'light', viewport: { value: 'phone' } }

/** The bottom dock shows at 640 px and narrower; use the phone viewport. */
export const DockVisitorOnLeaderboard: Story = {
  render: (args) => <PlayerNavDock {...args} />,
  globals: phone,
}
export const DockVisitorOnSignIn: Story = {
  ...DockVisitorOnLeaderboard,
  args: { current: 'sign-in' },
}
export const DockSignedInOnLeaderboard: Story = {
  ...DockVisitorOnLeaderboard,
  args: { signedIn: true, current: 'leaderboard' },
}
export const DockSignedInOnMyProfile: Story = {
  ...DockVisitorOnLeaderboard,
  args: { signedIn: true, current: 'profile' },
}
export const DockNoCurrentPage: Story = {
  ...DockVisitorOnLeaderboard,
  args: { signedIn: true, current: null },
}
export const DockDialogOpen: Story = {
  ...DockSignedInOnMyProfile,
  render: (args) => (
    <>
      <PlayerNavDock {...args} />
      <SignOutSheet open onOpenChange={fn()} onSignOut={fn()} />
    </>
  ),
}

function ToastOnMount() {
  useEffect(() => {
    toast('Profile saved')
  }, [])
  return <Toaster />
}
export const DockToast: Story = {
  ...DockSignedInOnMyProfile,
  render: (args) => (
    <>
      <PlayerNavDock {...args} />
      <ToastOnMount />
    </>
  ),
}
export const DockLightVisitor: Story = { ...DockVisitorOnLeaderboard, globals: light }
export const DockLightSignedIn: Story = {
  ...DockSignedInOnMyProfile,
  globals: light,
}
/** Wider than 640 px nothing is drawn: the top-bar PlayerNav carries the links. */
export const DockHiddenOnDesktop: Story = {
  ...DockVisitorOnLeaderboard,
  globals: { viewport: { value: 'desktop' } },
}
