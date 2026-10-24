import { configureStore } from "@reduxjs/toolkit";
import type { Meta, StoryObj } from "@storybook/react";
import { Provider } from "react-redux";
import { MOCK_AUTH_USER_WITH_NAME } from "@/constants/mock-auth-user";
import { LogoutDialogProvider } from "@/hooks/useLogoutDialog/client";
import authReducer from "@/store/slices/authSlice";
import uiReducer from "@/store/slices/uiSlice";
import { MobileDrawer } from "./MobileDrawer";

function makeStore(
	isMobileDrawerOpen: boolean,
	user: typeof MOCK_AUTH_USER_WITH_NAME | null = null,
) {
	return configureStore({
		reducer: { auth: authReducer, ui: uiReducer },
		preloadedState: {
			auth: { user, initialized: true },
			ui: { isMobileDrawerOpen, dashboardViewMode: "map" as const },
		},
	});
}

const meta: Meta<typeof MobileDrawer> = {
	title: "Navigation/MobileDrawer",
	component: MobileDrawer,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<LogoutDialogProvider>
				<Story />
			</LogoutDialogProvider>
		),
	],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof MobileDrawer>;

export const Closed: Story = {
	parameters: {
		nextjs: { navigation: { pathname: "/dashboard" } },
	},
	decorators: [
		(Story) => (
			<Provider store={makeStore(false)}>
				<Story />
			</Provider>
		),
	],
};

export const Open: Story = {
	parameters: {
		nextjs: { navigation: { pathname: "/dashboard" } },
	},
	decorators: [
		(Story) => (
			<Provider store={makeStore(true)}>
				<Story />
			</Provider>
		),
	],
};

export const OpenActiveClubs: Story = {
	parameters: {
		nextjs: { navigation: { pathname: "/clubs" } },
	},
	decorators: [
		(Story) => (
			<Provider store={makeStore(true)}>
				<Story />
			</Provider>
		),
	],
};

export const OpenActiveSessions: Story = {
	parameters: {
		nextjs: { navigation: { pathname: "/sessions" } },
	},
	decorators: [
		(Story) => (
			<Provider store={makeStore(true)}>
				<Story />
			</Provider>
		),
	],
};

/** Drawer footer uses `profiles.name` when `currentProfile` is passed from the server shell. */
export const OpenWithProfileFromDatabase: Story = {
	args: {
		currentProfile: {
			name: "Jose Adrian GWAPO",
			avatarUrl: null,
		},
	},
	parameters: {
		nextjs: { navigation: { pathname: "/dashboard" } },
	},
	decorators: [
		(Story) => (
			<Provider
				store={makeStore(true, {
					...MOCK_AUTH_USER_WITH_NAME,
					user_metadata: { full_name: "Facebook Display Name" },
				})}
			>
				<Story />
			</Provider>
		),
	],
};
