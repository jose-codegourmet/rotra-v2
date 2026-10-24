import type { Meta, StoryObj } from "@storybook/react";
import { PlayStyleCard } from "./PlayStyleCard";

const MOCK_USER = {
	id: "user-1",
	name: "Alex Chen",
	avatarUrl: null,
};

const meta: Meta<typeof PlayStyleCard> = {
	title: "profile/PlayStyleCard",
	component: PlayStyleCard,
	tags: ["autodocs"],
	argTypes: {
		user: { control: "object" },
	},
};

export default meta;
type Story = StoryObj<typeof PlayStyleCard>;

export const Default: Story = {
	args: {
		user: MOCK_USER,
	},
};

export const SingleTag: Story = {
	args: {
		user: { ...MOCK_USER, name: "Sam Lee" },
	},
};

export const ManyTags: Story = {
	args: {
		user: { ...MOCK_USER, name: "Elena Reyes" },
	},
};

export const EmptyTags: Story = {
	args: {
		user: { ...MOCK_USER, name: "Jordan Cruz" },
	},
};
