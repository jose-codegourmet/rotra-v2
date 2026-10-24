import type { Meta, StoryObj } from "@storybook/react";
import {
	countUnreadNotifications,
	MOCK_NOTIFICATIONS,
} from "@/constants/mock-notifications";
import { LogoutDialogProvider } from "@/hooks/useLogoutDialog/client";
import { Navbar } from "./Navbar";

const meta: Meta<typeof Navbar> = {
	title: "Navigation/Navbar",
	component: Navbar,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(Story) => (
			<LogoutDialogProvider>
				<Story />
			</LogoutDialogProvider>
		),
	],
	argTypes: {
		pageTitle: { control: "text" },
		pageSubtitle: { control: "text" },
	},
};

export default meta;
type Story = StoryObj<typeof Navbar>;

const defaultNotifications = {
	notifications: MOCK_NOTIFICATIONS,
	unreadCount: countUnreadNotifications(MOCK_NOTIFICATIONS),
};

export const Default: Story = {
	args: {
		pageTitle: "Dashboard",
		pageSubtitle: "ROTRA",
		...defaultNotifications,
	},
};

export const ClubProfile: Story = {
	args: {
		pageTitle: "Club Profile",
		pageSubtitle: "Sunrise Badminton Club",
		...defaultNotifications,
	},
};

export const Sessions: Story = {
	args: {
		pageTitle: "Sessions",
		pageSubtitle: "Upcoming & Recurring",
		...defaultNotifications,
	},
};
