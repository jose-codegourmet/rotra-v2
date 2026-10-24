import type { Meta, StoryObj } from "@storybook/react";

import { MatchDateBlock } from "./MatchDateBlock";

const meta: Meta<typeof MatchDateBlock> = {
	title: "profile/MatchDateBlock",
	component: MatchDateBlock,
	tags: ["autodocs"],
	argTypes: {
		date: { control: "text" },
	},
};

export default meta;
type Story = StoryObj<typeof MatchDateBlock>;

export const Default: Story = {
	args: {
		date: "2024-10-24",
	},
};

export const NewYear: Story = {
	args: {
		date: "2025-01-01",
	},
};

export const EndOfYear: Story = {
	args: {
		date: "2024-12-31",
	},
};

export const MidYear: Story = {
	args: {
		date: "2024-06-15",
	},
};
