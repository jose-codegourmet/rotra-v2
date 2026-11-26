import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { OnboardingStepForm } from './OnboardingStepForm'

const meta = {
  title: 'Player/OnboardingStepForm',
  component: OnboardingStepForm,
  parameters: { layout: 'fullscreen' },
  args: { step: 2, firstName: 'Jomar', onBack: fn(), onSkip: fn(), onSubmit: fn() },
} satisfies Meta<typeof OnboardingStepForm>

export default meta
type Story = StoryObj<typeof meta>

export const WhereYouPlay: Story = {}
export const WhereYouPlayLight: Story = { globals: { theme: 'light' } }
export const ShotsYouKnow: Story = { args: { step: 3 } }
export const ShotsWithOwn: Story = {
  args: {
    step: 3,
    defaultValues: {
      playStyle: '',
      shots: ['smash', 'drop'],
      shotsOther: ['Crosscourt drop'],
      favoritePlayer: '',
      favoritePlayerOther: '',
    },
  },
}
export const FavoritePlayer: Story = { args: { step: 4 } }
export const FavoriteOthersNoName: Story = {
  args: {
    step: 4,
    defaultValues: {
      playStyle: '',
      shots: [],
      shotsOther: [],
      favoritePlayer: 'other',
      favoritePlayerOther: '',
    },
  },
}
export const FavoriteLight: Story = { args: { step: 4 }, globals: { theme: 'light' } }
export const Phone: Story = { globals: { viewport: { value: 'phone' } } }
export const Saving: Story = { args: { isPending: true } }
