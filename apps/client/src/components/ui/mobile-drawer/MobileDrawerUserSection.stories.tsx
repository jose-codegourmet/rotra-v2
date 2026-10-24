import { configureStore } from "@reduxjs/toolkit";
import type { Meta, StoryObj } from "@storybook/react";
import { Provider } from "react-redux";
import { MOCK_AUTH_USER_WITH_NAME } from "@/constants/mock-auth-user";
import { LogoutDialogProvider } from "@/hooks/useLogoutDialog/client";
import authReducer from "@/store/slices/authSlice";
import uiReducer from "@/store/slices/uiSlice";
import { MobileDrawerUserSection } from "./MobileDrawerUserSection";

function makeStore() {
	return configureStore({
		reducer: { auth: authReducer, ui: uiReducer },
		preloadedState: {
			auth: {
				user: {
					...MOCK_AUTH_USER_WITH_NAME,
					user_metadata: { full_name: "Facebook Display Name" },
				},
				initialized: true,
			},
			ui: { isMobileDrawerOpen: true, dashboardViewMode: "map" as const },
		},
	});
}

const meta: Meta<typeof MobileDrawerUserSection> = {
	title: "Navigation/MobileDrawerUserSection",
	component: MobileDrawerUserSection,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<Provider store={makeStore()}>
				<LogoutDialogProvider>
					<div className="w-[360px] bg-bg-base">
						<Story />
					</div>
				</LogoutDialogProvider>
			</Provider>
		),
	],
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj<typeof MobileDrawerUserSection>;

export const Default: Story = {};

export const AdminRole: Story = {
	args: {
		adminRole: "admin",
	},
};

export const SuperAdminRole: Story = {
	args: {
		adminRole: "super_admin",
	},
};

export const WithProfileFromDatabase: Story = {
	args: {
		currentProfile: {
			name: "Jose Adrian GWAPO",
			avatarUrl: null,
		},
	},
};

export const FacebookMetadataFallback: Story = {
	args: {
		currentProfile: null,
	},
};
