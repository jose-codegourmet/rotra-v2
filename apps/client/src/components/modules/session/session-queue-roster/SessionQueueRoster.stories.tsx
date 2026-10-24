import type { Meta, StoryObj } from "@storybook/react";
import {
	MOCK_SESSION_JOIN,
	MOCK_SESSION_JOIN_QUEUE,
	MOCK_SESSION_JOINED_QUEUE,
} from "@/constants/mock-session-join";
import { SessionQueueRoster } from "./SessionQueueRoster";

const meta: Meta<typeof SessionQueueRoster> = {
	title: "session/SessionQueueRoster",
	component: SessionQueueRoster,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SessionQueueRoster>;

export const Listing: Story = {
	args: {
		players: MOCK_SESSION_JOIN_QUEUE,
		summary: MOCK_SESSION_JOIN.listingQueueSummary,
	},
};

export const Joined: Story = {
	args: {
		players: MOCK_SESSION_JOINED_QUEUE,
		summary: MOCK_SESSION_JOIN.joinedQueueSummary,
	},
};
