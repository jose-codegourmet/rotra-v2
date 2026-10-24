import type { Meta, StoryObj } from "@storybook/react";
import { StatsCards } from "./StatsCards";

const MOCK_USER = {
	id: "user-1",
	name: "Alex Chen",
	avatarUrl: null,
};

const meta: Meta<typeof StatsCards> = {
	title: "profile/StatsCards",
	component: StatsCards,
	tags: ["autodocs"],
	argTypes: {
		user: { control: "object" },
	},
};

export default meta;
type Story = StoryObj<typeof StatsCards>;

export const Default: Story = {
	args: {
		user: MOCK_USER,
	},
};

export const NoAccentStats: Story = {
	args: {
		user: { ...MOCK_USER, name: "No Accent User" },
	},
};

export const AllAccentStats: Story = {
	args: {
		user: { ...MOCK_USER, name: "All Accent User" },
	},
};

export const NoSubText: Story = {
	args: {
		user: { ...MOCK_USER, name: "No Subtext User" },
	},
};
