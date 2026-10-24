import type { Meta, StoryObj } from "@storybook/react";
import { MOCK_NOTIFICATIONS } from "@/constants/mock-notifications";
import { NotificationsView } from "./NotificationsView";

const meta: Meta<typeof NotificationsView> = {
	title: "Modules/Notifications/NotificationsView",
	component: NotificationsView,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof NotificationsView>;

export const Default: Story = {
	args: {
		notifications: MOCK_NOTIFICATIONS,
	},
};

export const Empty: Story = {
	args: {
		notifications: [],
	},
};
