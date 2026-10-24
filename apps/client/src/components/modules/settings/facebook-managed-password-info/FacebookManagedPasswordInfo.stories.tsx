import type { Meta, StoryObj } from "@storybook/react";

import { FacebookManagedPasswordInfo } from "./FacebookManagedPasswordInfo";

const meta: Meta<typeof FacebookManagedPasswordInfo> = {
	title: "modules/settings/FacebookManagedPasswordInfo",
	component: FacebookManagedPasswordInfo,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="max-w-lg rounded-lg border border-border bg-bg-surface p-5 shadow-card">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof FacebookManagedPasswordInfo>;

export const Default: Story = {};
