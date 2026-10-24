import type { Meta, StoryObj } from "@storybook/react";
import { SessionQueueStatusBadge } from "./SessionQueueStatusBadge";

const meta: Meta<typeof SessionQueueStatusBadge> = {
	title: "session/SessionQueueStatusBadge",
	component: SessionQueueStatusBadge,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SessionQueueStatusBadge>;

export const Accepted: Story = {
	args: { status: "accepted" },
};

export const Waitlisted: Story = {
	args: { status: "waitlisted" },
};

export const Reserved: Story = {
	args: { status: "reserved" },
};
