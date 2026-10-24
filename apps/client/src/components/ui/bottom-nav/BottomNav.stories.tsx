import type { Meta, StoryObj } from "@storybook/react";
import { BottomNav } from "./BottomNav";

const meta: Meta<typeof BottomNav> = {
	title: "Navigation/BottomNav",
	component: BottomNav,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
		viewport: {
			defaultViewport: "mobile1",
		},
	},
};

export default meta;
type Story = StoryObj<typeof BottomNav>;

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
		unreadCount: 8,
	},
	parameters: {
		nextjs: { navigation: { pathname: "/clubs" } },
	},
};

export const ActiveSessions: Story = {
	args: {
		unreadCount: 8,
	},
	parameters: {
		nextjs: { navigation: { pathname: "/sessions" } },
	},
};

export const ActiveProfile: Story = {
	args: {
		unreadCount: 8,
	},
	parameters: {
		nextjs: { navigation: { pathname: "/profile" } },
	},
};
