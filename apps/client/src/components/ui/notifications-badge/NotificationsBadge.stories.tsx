"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { NotificationsBadge } from "./NotificationsBadge";

const meta: Meta<typeof NotificationsBadge> = {
	title: "UI/NotificationsBadge",
	component: NotificationsBadge,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof NotificationsBadge>;

export const Default: Story = {
	args: {
		count: 8,
	},
};

export const Single: Story = {
	args: {
		count: 1,
		size: "sm",
	},
};

export const CappedAt99Plus: Story = {
	args: {
		count: 150,
		max: 99,
	},
};

export const MediumMuted: Story = {
	args: {
		count: 12,
		size: "md",
		tone: "muted",
	},
};

export const ZeroHidden: Story = {
	args: {
		count: 0,
	},
};
