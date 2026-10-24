"use client";

import { configureStore } from "@reduxjs/toolkit";
import type { Meta, StoryObj } from "@storybook/react";
import type { User } from "@supabase/supabase-js";
import { Provider } from "react-redux";

import {
	MOCK_AUTH_USER,
	MOCK_AUTH_USER_WITH_NAME,
} from "@/constants/mock-auth-user";
import authReducer from "@/store/slices/authSlice";

import { SettingsProfileCard } from "./SettingsProfileCard";

function makeStore(user: User | null, initialized: boolean) {
	return configureStore({
		reducer: { auth: authReducer },
		preloadedState: {
			auth: {
				user,
				initialized,
			},
		},
	});
}

const meta: Meta<typeof SettingsProfileCard> = {
	title: "modules/settings/SettingsProfileCard",
	component: SettingsProfileCard,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
	},
};

export default meta;
type Story = StoryObj<typeof SettingsProfileCard>;

export const Default: Story = {
	decorators: [
		(Story) => (
			<Provider store={makeStore(MOCK_AUTH_USER_WITH_NAME, true)}>
				<div className="max-w-[800px]">
					<Story />
				</div>
			</Provider>
		),
	],
};

export const EmailOnlyUser: Story = {
	decorators: [
		(Story) => (
			<Provider store={makeStore(MOCK_AUTH_USER, true)}>
				<div className="max-w-[800px]">
					<Story />
				</div>
			</Provider>
		),
	],
};

export const NotInitialized: Story = {
	decorators: [
		(Story) => (
			<Provider store={makeStore(null, false)}>
				<div className="max-w-[800px]">
					<Story />
				</div>
			</Provider>
		),
	],
};
