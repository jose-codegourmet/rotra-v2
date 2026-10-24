"use client";

import { configureStore } from "@reduxjs/toolkit";
import type { Meta, StoryObj } from "@storybook/react";
import { Provider } from "react-redux";
import { MOCK_AUTH_USER_WITH_NAME } from "@/constants/mock-auth-user";
import authReducer from "@/store/slices/authSlice";
import { SidebarUserMenu } from "./SidebarUserMenu";

function makeStore() {
	return configureStore({
		reducer: { auth: authReducer },
		preloadedState: {
			auth: {
				user: {
					...MOCK_AUTH_USER_WITH_NAME,
					user_metadata: { full_name: "Facebook Display Name" },
				},
				initialized: true,
			},
		},
	});
}

const meta: Meta<typeof SidebarUserMenu> = {
	title: "Navigation/SidebarUserMenu",
	component: SidebarUserMenu,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<Provider store={makeStore()}>
				<Story />
			</Provider>
		),
	],
	parameters: {
		layout: "padded",
	},
};

export default meta;
type Story = StoryObj<typeof SidebarUserMenu>;

export const Default: Story = {
	render: (args) => (
		<div className="flex min-h-[280px] w-64 flex-col border border-border rounded-lg bg-bg-base">
			<div className="flex-1" />
			<SidebarUserMenu {...args} />
		</div>
	),
};

export const WithProfileFromDatabase: Story = {
	args: {
		currentProfile: {
			name: "Jose Adrian GWAPO",
			avatarUrl: null,
		},
	},
	render: (args) => (
		<div className="flex min-h-[280px] w-64 flex-col border border-border rounded-lg bg-bg-base">
			<div className="flex-1" />
			<SidebarUserMenu {...args} />
		</div>
	),
};

export const FacebookMetadataFallback: Story = {
	args: {
		currentProfile: null,
	},
	render: (args) => (
		<div className="flex min-h-[280px] w-64 flex-col border border-border rounded-lg bg-bg-base">
			<div className="flex-1" />
			<SidebarUserMenu {...args} />
		</div>
	),
};
