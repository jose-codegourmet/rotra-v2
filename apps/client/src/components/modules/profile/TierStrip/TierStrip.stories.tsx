import type { Meta, StoryObj } from "@storybook/react";

import { MOCK_PLAYER } from "@/constants/mock-player";

import { TierStrip } from "./TierStrip";

const meta: Meta<typeof TierStrip> = {
	title: "rotra/TierStrip",
	component: TierStrip,
	tags: ["autodocs"],
	argTypes: {
		tier: { control: "text" },
		tierPips: { control: "object" },
	},
};

export default meta;
type Story = StoryObj<typeof TierStrip>;

export const Default: Story = {
	args: {
		tier: MOCK_PLAYER.tier,
		tierPips: MOCK_PLAYER.tierPips,
	},
};

export const FullyFilled: Story = {
	args: {
		tier: "Warrior 2",
		tierPips: { filled: 5, total: 5 },
	},
};

export const Empty: Story = {
	args: {
		tier: "Warrior 2",
		tierPips: { filled: 0, total: 5 },
	},
};

export const SinglePip: Story = {
	args: {
		tier: "Novice 1",
		tierPips: { filled: 1, total: 1 },
	},
};

export const AllUnfilled: Story = {
	args: {
		tier: "Legend 3",
		tierPips: { filled: 0, total: 8 },
	},
};
