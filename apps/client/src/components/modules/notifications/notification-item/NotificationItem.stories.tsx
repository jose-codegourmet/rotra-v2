"use client";

import type { Meta, StoryObj } from "@storybook/react";
import type { Notification } from "@/constants/mock-notifications";
import {
	MOCK_NOTIFICATIONS,
	notificationsBySeverity,
} from "@/constants/mock-notifications";
import { NotificationItem } from "./NotificationItem";

function storyNotification(index: number): Notification {
	const n = MOCK_NOTIFICATIONS[index];
	if (n === undefined) {
		throw new Error(`Missing notification at index ${index}`);
	}
	return n;
}

function firstBySeverity(severity: Notification["severity"]): Notification {
	const first = notificationsBySeverity(severity)[0];
	if (first === undefined) {
		throw new Error(`No mock notification for severity: ${severity}`);
	}
	return first;
}

function notificationById(id: string): Notification {
	const n = MOCK_NOTIFICATIONS.find((row) => row.id === id);
	if (n === undefined) {
		throw new Error(`No mock notification with id: ${id}`);
	}
	return n;
}

const meta: Meta<typeof NotificationItem> = {
	title: "Modules/Notifications/NotificationItem",
	component: NotificationItem,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof NotificationItem>;

export const Unread: Story = {
	args: {
		notification: storyNotification(0),
		compact: false,
	},
};

export const Read: Story = {
	args: {
		notification: storyNotification(8),
		compact: false,
	},
};

export const CompactDropdown: Story = {
	args: {
		notification: storyNotification(1),
		compact: true,
	},
};

export const UrgentUnread: Story = {
	args: {
		notification: firstBySeverity("urgent"),
		compact: false,
	},
};

export const UrgentRead: Story = {
	args: {
		notification: notificationById("12"),
		compact: false,
	},
};

export const WarningUnread: Story = {
	args: {
		notification: firstBySeverity("warning"),
		compact: false,
	},
};

export const InfoUnread: Story = {
	args: {
		notification: firstBySeverity("info"),
		compact: false,
	},
};
