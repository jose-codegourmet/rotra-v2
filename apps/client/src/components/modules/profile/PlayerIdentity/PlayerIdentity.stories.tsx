import type { Meta, StoryObj } from "@storybook/react";

import { PlayerIdentity } from "./PlayerIdentity";

const meta: Meta<typeof PlayerIdentity> = {
	title: "rotra/PlayerIdentity",
	component: PlayerIdentity,
	tags: ["autodocs"],
	argTypes: {
		disabled: { control: "boolean" },
		badge: { control: "text" },
		imageUrl: { control: "text" },
	},
};

export default meta;
type Story = StoryObj<typeof PlayerIdentity>;

export const Default: Story = {
	args: {
		name: "Alex Santos",
		initials: "AS",
		level: "Intermediate",
	},
};

export const WithBadge: Story = {
	args: {
		name: "Alex Santos",
		initials: "AS",
		level: "Intermediate",
		badge: "PRO",
	},
};

export const WithImage: Story = {
	args: {
		name: "Alex Santos",
		initials: "AS",
		level: "Intermediate",
		imageUrl: "https://i.pravatar.cc/80?img=3",
	},
};

export const WithImageAndBadge: Story = {
	args: {
		name: "Alex Santos",
		initials: "AS",
		level: "Intermediate",
		imageUrl: "https://i.pravatar.cc/80?img=3",
		badge: "PRO",
	},
};

export const Disabled: Story = {
	args: {
		name: "Alex Santos",
		initials: "AS",
		level: "Intermediate",
		badge: "PRO",
		disabled: true,
	},
};

export const DisabledWithImage: Story = {
	args: {
		name: "Alex Santos",
		initials: "AS",
		level: "Intermediate",
		imageUrl: "https://i.pravatar.cc/80?img=3",
		badge: "PRO",
		disabled: true,
	},
};
