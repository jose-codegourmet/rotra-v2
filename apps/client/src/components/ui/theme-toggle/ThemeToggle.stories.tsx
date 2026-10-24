"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";

const meta: Meta<typeof ThemeToggle> = {
	title: "UI/ThemeToggle",
	component: ThemeToggle,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["icon", "row"],
		},
	},
	decorators: [
		(Story) => (
			<ThemeProvider>
				<Story />
			</ThemeProvider>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Icon: Story = {
	args: {
		variant: "icon",
	},
};

export const Row: Story = {
	args: {
		variant: "row",
	},
	render: (args) => (
		<div className="w-64 border border-border rounded-lg overflow-hidden bg-bg-base">
			<ThemeToggle {...args} />
		</div>
	),
};
