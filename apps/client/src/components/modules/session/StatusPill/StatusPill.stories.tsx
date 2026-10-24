import type { Meta, StoryObj } from "@storybook/react";

import { StatusPill } from "./StatusPill";

const meta: Meta<typeof StatusPill> = {
	title: "session/StatusPill",
	component: StatusPill,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof StatusPill>;

export const Playing: Story = {
	args: { status: "playing", children: "Playing" },
};

export const Waiting: Story = {
	args: { status: "waiting", children: "Waiting" },
};

export const Ready: Story = {
	args: { status: "ready", children: "Ready" },
};

export const Away: Story = {
	args: { status: "away", children: "Away (eating)" },
};
