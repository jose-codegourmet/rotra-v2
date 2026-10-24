import type { Meta, StoryObj } from "@storybook/react";

import { QueryProvider } from "@/providers/QueryProvider";

import { AccountSettingsView } from "./AccountSettingsView";

const meta: Meta<typeof AccountSettingsView> = {
	title: "modules/settings/AccountSettingsView",
	component: AccountSettingsView,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<QueryProvider>
				<div className="max-w-2xl p-6 bg-bg-base min-h-[480px]">
					<Story />
				</div>
			</QueryProvider>
		),
	],
	argTypes: {
		isTesterAccount: { control: "boolean" },
		isFacebookUser: { control: "boolean" },
	},
};

export default meta;
type Story = StoryObj<typeof AccountSettingsView>;

const baseArgs = {
	profileId: "00000000-0000-0000-0000-000000000001",
	name: "Alex Santos",
	email: "alex@example.com",
	isTesterAccount: false,
	isFacebookUser: false,
};

export const Default: Story = {
	args: baseArgs,
};

export const EmailPasswordAccount: Story = {
	args: baseArgs,
};

export const TesterAccount: Story = {
	args: {
		...baseArgs,
		isTesterAccount: true,
		email: "tester@rotra.app",
	},
};

export const FacebookAccount: Story = {
	args: {
		...baseArgs,
		isFacebookUser: true,
		email: null,
	},
};
