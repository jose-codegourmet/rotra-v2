import { queueSessionFixtures } from '@rotra/data/fixtures/queueSessions'
import { SignOutSheet } from '@rotra/ui/sign-out-sheet'
import { Toaster, toast } from '@rotra/ui/toaster'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { fn } from 'storybook/test'
import { PlayerNav, PlayerNavDock } from './PlayerNav'

const noop = () => undefined
const settings = { onNavigate: noop }
const session = queueSessionFixtures.sessions[0]
if (!session) throw new Error('Queue Session fixture missing')
const href = `/queue/s/${encodeURIComponent(session.publicSlug)}`
const play = {
  label: 'Play',
  live: true,
  href,
  accessibleName: `Back to session: ${session.title}`,
} as const
const ready = {
  label: 'Ready',
  live: false,
  href,
  accessibleName: `Incoming session: ${session.title}`,
} as const
const nextUp = { ...ready, label: 'Next up' } as const

const meta = {
  title: 'Player/PlayerNav',
  component: PlayerNav,
  globals: { viewport: { value: 'desktop' } },
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
  args: { signedIn: true, current: 'profile', settings },
}

export const SignedInOnLeaderboard: Story = {
  args: { signedIn: true, current: 'leaderboard', settings },
}

export const Play: Story = {
  args: { signedIn: true, current: null, session: play },
}
export const Ready: Story = {
  args: { signedIn: true, current: null, session: ready },
}
export const NextUp: Story = {
  args: { signedIn: true, current: null, session: nextUp, settings },
}
export const SettingsCurrent: Story = {
  args: { signedIn: true, current: 'settings', settings },
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
  args: SignedInOnLeaderboard.args,
}
export const DockSignedInOnMyProfile: Story = {
  ...DockVisitorOnLeaderboard,
  args: { signedIn: true, current: 'profile', settings },
}
export const DockNoCurrentPage: Story = {
  ...DockVisitorOnLeaderboard,
  args: { signedIn: true, current: null, settings },
}
export const DockPlay: Story = { ...DockVisitorOnLeaderboard, args: Play.args }
export const DockReady: Story = { ...DockVisitorOnLeaderboard, args: Ready.args }
export const DockNextUp: Story = { ...DockVisitorOnLeaderboard, args: NextUp.args }
export const DockSettingsCurrent: Story = {
  ...DockVisitorOnLeaderboard,
  args: SettingsCurrent.args,
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
