import type { Meta, StoryObj } from "@storybook/react";
import { MatchHistory } from "./MatchHistory";

const MOCK_USER = {
	id: "user-1",
	name: "Alex Chen",
	avatarUrl: null,
};

const meta: Meta<typeof MatchHistory> = {
	title: "profile/MatchHistory",
	component: MatchHistory,
	tags: ["autodocs"],
	argTypes: {
		user: { control: "object" },
		maxMatchPerView: { control: "number" },
		viewAllHref: { control: "text" },
	},
};

export default meta;
type Story = StoryObj<typeof MatchHistory>;

export const Default: Story = {
	args: {
		user: MOCK_USER,
		maxMatchPerView: 3,
	},
};

export const WithViewAllLink: Story = {
	args: {
		user: MOCK_USER,
		maxMatchPerView: 3,
		viewAllHref: "/matches",
	},
};

export const LimitedToOne: Story = {
	args: {
		user: MOCK_USER,
		maxMatchPerView: 1,
	},
};

export const EmptyHistory: Story = {
	args: {
		user: MOCK_USER,
		maxMatchPerView: 5,
	},
};
