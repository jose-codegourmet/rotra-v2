import { Field } from '@rotra/ui/field'
import { TextInput } from '@rotra/ui/text-input'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { OnboardingFrame } from './OnboardingFrame'

const meta = {
  title: 'Player/OnboardingFrame',
  component: OnboardingFrame,
  parameters: { layout: 'fullscreen' },
  args: {
    step: 1,
    stepName: 'Your details',
    primaryLabel: 'Continue',
    onPrimary: fn(),
    onBack: fn(),
    onSkip: fn(),
    children: null,
  },
} satisfies Meta<typeof OnboardingFrame>

export default meta
type Story = StoryObj<typeof meta>

export const Step1: Story = {
  args: {
    hint: 'Next: 3 quick questions',
    onBack: undefined,
    onSkip: undefined,
    children: (
      <>
        <h1 className="text-2xl font-bold">Your details</h1>
        <p className="text-fg2">
          Only fields marked Required are needed to continue; the rest can wait.
        </p>
        <Field label="Full name" required>
          <TextInput autoComplete="name" />
        </Field>
      </>
    ),
  },
}

const question = (title: string, body: string) => (
  <div className="flex flex-col gap-1.5">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="text-fg2">{body}</p>
  </div>
)

export const Step2: Story = {
  args: {
    step: 2,
    stepName: 'Where you play',
    children: question('How do you play, Rion?', "Pick where you're most at home on court."),
  },
}

export const Step3: Story = {
  args: {
    step: 3,
    stepName: 'Shots you know',
    children: question('Which shots do you have?', 'Pick all that apply, or add your own with Others.'),
  },
}

export const Step4: Story = {
  args: {
    step: 4,
    stepName: 'Favorite player',
    primaryLabel: 'Finish',
    children: question(
      "Who's your favorite badminton player?",
      'Pick one, or choose Others and type a name.',
    ),
  },
}

export const Pending: Story = {
  args: { ...Step1.args, primaryLabel: 'Completing…', primaryPending: true },
}
