"use client";

import type { Meta, StoryObj } from "@storybook/react";
import {
	countUnreadNotifications,
	MOCK_NOTIFICATIONS,
} from "@/constants/mock-notifications";
import { NotificationsDropdown } from "./NotificationsDropdown";

const meta: Meta<typeof NotificationsDropdown> = {
	title: "Modules/Notifications/NotificationsDropdown",
	component: NotificationsDropdown,
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof NotificationsDropdown>;

export const Default: Story = {
	args: {
		notifications: MOCK_NOTIFICATIONS,
		unreadCount: countUnreadNotifications(MOCK_NOTIFICATIONS),
	},
};

export const Empty: Story = {
	args: {
		notifications: [],
		unreadCount: 0,
	},
};
