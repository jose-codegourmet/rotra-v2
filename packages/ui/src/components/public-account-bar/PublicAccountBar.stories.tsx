import { profilePictureSrc } from '@rotra/ui/profile-picture'
import { ThemeProvider } from '@rotra/ui/theme-provider'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useGlobals } from 'storybook/preview-api'
import { expect, fn, userEvent, within } from 'storybook/test'
import { PublicAccountBar, type PublicAccountBarProps } from './PublicAccountBar'

const mikee = {
  name: 'Mikee Abellana',
  shortName: 'Mikee',
  pictureUrl: profilePictureSrc('character:a', 'player-mikee', 'Mikee Abellana'),
  rtrId: 'RTR-PH-CEB-031526-0001',
}

const meta = {
  title: 'Queue/PublicAccountBar',
  component: PublicAccountBar,
  // The theme toggle in the bar also moves the Theme toolbar, so the two always agree.
  decorators: [
    (Story) => {
      const [, updateGlobals] = useGlobals()
      return (
        <ThemeProvider
          storageKey="storybook-theme"
          onThemeChange={(theme) => updateGlobals({ theme })}
        >
          <div className="min-h-80 bg-bg text-fg">
            <Story />
          </div>
        </ThemeProvider>
      )
    },
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    viewer: null,
    loginHref: '#login',
    profileHref: '#profile',
    onSignOut: fn(),
    signingOut: false,
  },
} satisfies Meta<PublicAccountBarProps>

export default meta
type Story = StoryObj<typeof meta>

const openMenu: Story['play'] = async ({ canvasElement, args }) => {
  const canvas = within(canvasElement)
  const name = args.viewer?.name ?? ''
  await userEvent.click(canvas.getByRole('button', { name: `Signed in as ${name}. Account menu` }))
  await expect(within(canvasElement.ownerDocument.body).getByRole('menu')).toBeVisible()
}

/** A visitor, or a guest with a request: Log in with ROTRA Player. */
export const SignedOut: Story = {}
export const SignedOutLight: Story = { globals: { theme: 'light' } }

export const SignedIn: Story = { args: { viewer: mikee } }
export const SignedInLight: Story = { ...SignedIn, globals: { theme: 'light' } }

export const MenuOpen: Story = { args: { viewer: mikee }, play: openMenu }
export const MenuOpenLight: Story = { ...MenuOpen, globals: { theme: 'light' } }

/** The pill stops at 14 characters with an ellipsis; the menu header truncates the full name. */
export const LongName: Story = {
  args: {
    viewer: {
      name: 'Maximiliano Bartholomew Dela Cruz-Villanueva',
      shortName: 'Maximiliano-Bartholomew',
      rtrId: 'RTR-PH-CEB-040226-0011',
    },
  },
  play: openMenu,
}
export const LongNameLight: Story = { ...LongName, globals: { theme: 'light' } }

/** Sign out is running: the row is disabled. */
export const SigningOut: Story = {
  args: { viewer: mikee, signingOut: true },
  play: openMenu,
}
export const SigningOutLight: Story = { ...SigningOut, globals: { theme: 'light' } }

export const Phone: Story = {
  args: { viewer: mikee },
  play: openMenu,
  globals: { viewport: { value: 'phone' } },
}
export const PhoneLight: Story = {
  ...Phone,
  globals: { viewport: { value: 'phone' }, theme: 'light' },
}
export const PhoneSignedOut: Story = { globals: { viewport: { value: 'phone' } } }
