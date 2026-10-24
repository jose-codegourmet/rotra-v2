import type { Meta, StoryObj } from "@storybook/nextjs";

import { StepBlock } from "./StepBlock";

const meta = {
	title: "Modules/Onboarding/StepBlock",
	component: StepBlock,
	parameters: { layout: "centered" },
	args: {
		kicker: "Step 1 of 8",
		title: "Your name",
		subtitle: "Shown in queue, leaderboard, and your profile.",
		children: (
			<div className="text-small text-text-secondary">
				Step content goes here.
			</div>
		),
	},
} satisfies Meta<typeof StepBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
