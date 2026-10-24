import type { Meta, StoryObj } from "@storybook/react";
import { MOCK_AUTH_USER_WITH_NAME } from "@/constants/mock-auth-user";
import { SmallUserCard } from "./SmallUserCard";

const meta: Meta<typeof SmallUserCard> = {
	title: "UI/SmallUserCard",
	component: SmallUserCard,
	tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SmallUserCard>;

export const DesktopOwner: Story = {
	args: {
		user: MOCK_AUTH_USER_WITH_NAME,
		isOwner: true,
	},
};

export const DesktopOtherProfile: Story = {
	args: {
		user: {
			...MOCK_AUTH_USER_WITH_NAME,
			id: "00000000-0000-0000-0000-000000000099",
		},
		isOwner: false,
	},
};

export const Mobile: Story = {
	args: {
		user: MOCK_AUTH_USER_WITH_NAME,
		isOwner: true,
		isMobile: true,
	},
	parameters: {
		viewport: {
			defaultViewport: "mobile1",
		},
	},
};

/** `profiles.name` wins over Facebook `full_name` in auth metadata. */
export const WithProfileFromDatabase: Story = {
	args: {
		user: {
			...MOCK_AUTH_USER_WITH_NAME,
			user_metadata: { full_name: "Facebook Display Name" },
		},
		isOwner: true,
		currentProfile: {
			name: "Jose Adrian GWAPO",
			avatarUrl: null,
		},
	},
};

/** When `currentProfile` is absent (e.g. shell not hydrated), falls back to auth metadata. */
export const FacebookMetadataFallback: Story = {
	args: {
		user: MOCK_AUTH_USER_WITH_NAME,
		isOwner: true,
		currentProfile: null,
	},
};
