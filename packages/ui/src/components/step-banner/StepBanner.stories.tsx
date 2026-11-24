import type { Meta, StoryObj } from '@storybook/react-vite'
import { StepBanner } from './StepBanner'

const meta = {
  title: 'Player/StepBanner',
  component: StepBanner,
  args: {
    src: '/art/onboarding/shots-banner.webp',
    alt: 'Tara with a fan of shot paths: smash, drop, clear, drive and net shot',
  },
} satisfies Meta<typeof StepBanner>

export default meta
type Story = StoryObj<typeof meta>

export const Shots: Story = {}
export const ShotsLight: Story = { globals: { theme: 'light' } }
export const ShotsPhone: Story = { globals: { viewport: { value: 'phone' } } }
export const Favorite: Story = {
  args: {
    src: '/art/onboarding/favorite-banner.webp',
    alt: 'Tara and Rion cheering in the stands at a pro player under the spotlight',
  },
}
export const FavoriteLight: Story = { ...Favorite, globals: { theme: 'light' } }
