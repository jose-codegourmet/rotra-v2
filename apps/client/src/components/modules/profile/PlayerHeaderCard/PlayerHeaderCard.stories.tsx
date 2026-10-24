import type { Meta, StoryObj } from "@storybook/react";
import { PlayerHeaderCard } from "./PlayerHeaderCard";

const MOCK_USER = {
	id: "user-1",
	name: "Alex Chen",
	avatarUrl: null,
};

const meta: Meta<typeof PlayerHeaderCard> = {
	title: "profile/PlayerHeaderCard",
	component: PlayerHeaderCard,
	tags: ["autodocs"],
	argTypes: {
		user: { control: "object" },
	},
};

export default meta;
type Story = StoryObj<typeof PlayerHeaderCard>;

export const Default: Story = {
	args: {
		user: MOCK_USER,
	},
};

export const BeginnerPlayer: Story = {
	args: {
		user: {
			...MOCK_USER,
			name: "Sam Lee",
		},
	},
};

export const AdvancedPlayer: Story = {
	args: {
		user: {
			...MOCK_USER,
			name: "Elena Reyes",
			avatarUrl: "https://example.com/avatar-er.png",
		},
	},
};
