import type { Meta, StoryObj } from "@storybook/react";
import { CurrentGearCard } from "./CurrentGearCard";

const MOCK_USER = {
	id: "user-1",
	name: "Alex Chen",
	avatarUrl: null,
};

const meta: Meta<typeof CurrentGearCard> = {
	title: "profile/CurrentGearCard",
	component: CurrentGearCard,
	tags: ["autodocs"],
	argTypes: {
		user: { control: "object" },
	},
};

export default meta;
type Story = StoryObj<typeof CurrentGearCard>;

export const Default: Story = {
	args: {
		user: MOCK_USER,
	},
};

export const NoGear: Story = {
	args: {
		user: MOCK_USER,
	},
};

export const FullKit: Story = {
	args: {
		user: MOCK_USER,
	},
};
