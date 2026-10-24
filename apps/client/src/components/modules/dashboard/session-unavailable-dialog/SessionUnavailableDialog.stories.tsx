"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { SessionUnavailableDialog } from "./SessionUnavailableDialog";

const meta: Meta<typeof SessionUnavailableDialog> = {
	title: "dashboard/SessionUnavailableDialog",
	component: SessionUnavailableDialog,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SessionUnavailableDialog>;

export const Default: Story = {
	args: {
		open: true,
		onOpenChange: () => {},
		onRefresh: () => {},
	},
};
