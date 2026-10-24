"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { QuickSessionButton } from "./QuickSessionButton";

const meta: Meta<typeof QuickSessionButton> = {
	title: "dashboard/QuickSessionButton",
	component: QuickSessionButton,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="relative min-h-[200px] bg-bg-base">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof QuickSessionButton>;

const noop = () => {};

export const Default: Story = {
	args: {
		variant: "create",
		onClick: noop,
	},
};

export const Hover: Story = {
	args: {
		variant: "create",
		onClick: noop,
	},
	parameters: {
		pseudo: { hover: true },
	},
};

export const Disabled: Story = {
	args: {
		variant: "create",
		disabled: true,
		onClick: noop,
	},
};

export const Resume: Story = {
	args: {
		variant: "resume",
		onClick: noop,
	},
};

export const Scheduled: Story = {
	args: {
		variant: "scheduled",
		onClick: noop,
	},
};
