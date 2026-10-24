import type { Meta, StoryObj } from "@storybook/react";

import {
	MOCK_COURTS,
	MOCK_NEXT_QUEUE,
	MOCK_ROSTER,
	MOCK_STANDING_MINI,
} from "@/constants/mock-session-ui";

import { ActiveQueueView } from "./ActiveQueueView";

const meta: Meta<typeof ActiveQueueView> = {
	title: "session/ActiveQueueView",
	component: ActiveQueueView,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ActiveQueueView>;

const inGame = MOCK_COURTS.filter((c) => c.variant === "active");
const inactive = MOCK_COURTS.filter((c) => c.variant === "empty");

export const Default: Story = {
	args: {
		inGameCourts: inGame,
		inactiveCourts: inactive,
		nextQueue: MOCK_NEXT_QUEUE,
		standingRows: MOCK_STANDING_MINI,
		roster: MOCK_ROSTER,
		onAssignCourt: () => {},
	},
};

export const SingleInactive: Story = {
	args: {
		inGameCourts: inGame,
		inactiveCourts: inactive.slice(0, 1),
		nextQueue: MOCK_NEXT_QUEUE.slice(0, 1),
		standingRows: MOCK_STANDING_MINI,
		roster: MOCK_ROSTER.slice(0, 3),
	},
};
