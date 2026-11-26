import { AuthCard } from '@rotra/ui/auth-card'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AuthArtProvider } from './AuthArtProvider'

const meta = {
  title: 'Shared/AuthArtProvider',
  component: AuthArtProvider,
  parameters: { layout: 'fullscreen' },
  args: { art: '/art/auth/queue-club-login-rion.webp', children: null },
} satisfies Meta<typeof AuthArtProvider>

export default meta
type Story = StoryObj<typeof meta>

/** Every AuthCard below the provider gets the art; no prop on the card. */
export const ForAllCardsBelow: Story = {
  render: (args) => (
    <AuthArtProvider art={args.art}>
      <AuthCard title="Club login" tagline="Run the game.">
        <p className="m-0 text-fg2">Form goes here.</p>
      </AuthCard>
    </AuthArtProvider>
  ),
}
