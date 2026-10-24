import type { Meta, StoryObj } from "@storybook/nextjs";

import { OnboardingFooter } from "./OnboardingFooter";

const meta = {
	title: "Modules/Onboarding/OnboardingFooter",
	component: OnboardingFooter,
	args: {
		step: 1,
		isCurrentStepValid: true,
		submitting: false,
		onBack: () => undefined,
		onStart: () => undefined,
		onNext: () => undefined,
		onFinish: () => undefined,
	},
} satisfies Meta<typeof OnboardingFooter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MidStep: Story = {};

export const FinalStepSubmitting: Story = {
	args: {
		step: 8,
		submitting: true,
	},
};
