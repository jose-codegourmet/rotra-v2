import type { Meta, StoryObj } from "@storybook/nextjs";

import { ProgressDots } from "./ProgressDots";

const meta = {
	title: "Modules/Onboarding/ProgressDots",
	component: ProgressDots,
	args: {
		currentStep: 3,
		totalSteps: 8,
	},
} satisfies Meta<typeof ProgressDots>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HiddenAtWelcome: Story = {
	args: { currentStep: 0 },
};
