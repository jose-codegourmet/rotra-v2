"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { CloseSessionDialog } from "./CloseSessionDialog";

const meta: Meta<typeof CloseSessionDialog> = {
	title: "session/CloseSessionDialog",
	component: CloseSessionDialog,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CloseSessionDialog>;

const noop = () => {};

export const Open: Story = {
	args: {
		open: true,
		onOpenChange: noop,
		onConfirm: noop,
		sessionTitle: "Friday Night Doubles",
		busy: false,
	},
};

export const Busy: Story = {
	args: {
		open: true,
		onOpenChange: noop,
		onConfirm: noop,
		sessionTitle: "Friday Night Doubles",
		busy: true,
	},
};
