"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button/Button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu/DropdownMenu";
import {
	MOCK_NOTIFICATIONS,
	type Notification,
	type NotificationSeverity,
	notificationsBySeverity,
} from "@/constants/mock-notifications";
import { NotificationDropdownItem } from "./NotificationDropdownItem";

function firstBySeverity(severity: NotificationSeverity): Notification {
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

const meta: Meta<typeof NotificationDropdownItem> = {
	title: "Modules/Notifications/NotificationDropdownItem",
	component: NotificationDropdownItem,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="flex min-h-[320px] items-start justify-center p-8">
				<DropdownMenu defaultOpen>
					<DropdownMenuTrigger asChild>
						<Button type="button" variant="outline">
							Open menu
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-[min(22rem,calc(100vw-2rem))] p-0"
					>
						<ul className="divide-y divide-border">
							<li>
								<Story />
							</li>
						</ul>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof NotificationDropdownItem>;

export const Urgent: Story = {
	args: {
		notification: firstBySeverity("urgent"),
	},
};

export const Warning: Story = {
	args: {
		notification: firstBySeverity("warning"),
	},
};

export const Info: Story = {
	args: {
		notification: firstBySeverity("info"),
	},
};

export const ReadInfo: Story = {
	args: {
		notification: notificationById("9"),
	},
};
