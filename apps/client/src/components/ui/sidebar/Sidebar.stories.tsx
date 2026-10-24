import type { Meta, StoryObj } from "@storybook/react";
import { Sidebar } from "./Sidebar";

const meta: Meta<typeof Sidebar> = {
	title: "Navigation/Sidebar",
	component: Sidebar,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {
	args: {
		unreadCount: 8,
	},
	parameters: {
		nextjs: { navigation: { pathname: "/dashboard" } },
	},
};

export const ActiveClubs: Story = {
	args: {
		unreadCount: 3,
	},
	parameters: {
		nextjs: { navigation: { pathname: "/clubs" } },
	},
};

export const ActiveSessions: Story = {
	args: {
		unreadCount: 0,
	},
	parameters: {
		nextjs: { navigation: { pathname: "/sessions" } },
	},
};

export const ActiveProfile: Story = {
	args: {
		unreadCount: 99,
	},
	parameters: {
		nextjs: { navigation: { pathname: "/profile" } },
	},
};

export const ActiveNotifications: Story = {
	args: {
		unreadCount: 5,
	},
	parameters: {
		nextjs: { navigation: { pathname: "/notifications" } },
	},
};
