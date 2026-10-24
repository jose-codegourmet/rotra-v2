"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { LeaveSessionDialog } from "./LeaveSessionDialog";

const meta: Meta<typeof LeaveSessionDialog> = {
	title: "session/LeaveSessionDialog",
	component: LeaveSessionDialog,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof LeaveSessionDialog>;

const noop = () => {};

export const Open: Story = {
	args: {
		open: true,
		onOpenChange: noop,
		onConfirm: noop,
		busy: false,
	},
};

export const Busy: Story = {
	args: {
		open: true,
		onOpenChange: noop,
		onConfirm: noop,
		busy: true,
	},
};
