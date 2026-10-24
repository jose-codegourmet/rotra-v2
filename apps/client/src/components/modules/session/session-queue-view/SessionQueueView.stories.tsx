import type { Meta, StoryObj } from "@storybook/react";
import {
	MOCK_QUEUE_NEXT_UP_PLAYERS,
	MOCK_QUEUE_UPCOMING_MATCHES,
	MOCK_SESSION_QUEUE,
} from "@/constants/mock-session-queue";
import { SessionQueueView } from "./SessionQueueView";

const meta: Meta<typeof SessionQueueView> = {
	title: "session/SessionQueueView",
	component: SessionQueueView,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof SessionQueueView>;

export const Default: Story = {
	args: {
		session: MOCK_SESSION_QUEUE,
		nextUpPlayers: MOCK_QUEUE_NEXT_UP_PLAYERS,
		upcomingMatches: MOCK_QUEUE_UPCOMING_MATCHES,
	},
};
