import type { Meta, StoryObj } from "@storybook/nextjs";

import { OnboardingWizard } from "./OnboardingWizard";

const meta = {
	title: "Modules/Onboarding/OnboardingWizard",
	component: OnboardingWizard,
	parameters: {
		layout: "fullscreen",
		nextjs: { appDirectory: true },
	},
	args: {
		welcomeKind: "first",
		displayName: "Alex",
		initialName: "",
		initialPhoneE164: "",
	},
} satisfies Meta<typeof OnboardingWizard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FirstTime: Story = {};

export const ReturningPlayer: Story = {
	args: {
		welcomeKind: "return_has_phone",
		initialName: "Alex Ramos",
		initialPhoneE164: "+639171234567",
	},
};
