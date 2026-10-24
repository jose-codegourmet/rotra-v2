import type { Meta, StoryObj } from "@storybook/react";

import {
	MOCK_NEXT_QUEUE,
	type NextQueueItem,
} from "@/constants/mock-session-ui";

import { NextQueueRow } from "./NextQueueRow";

const FALLBACK_ITEM: NextQueueItem = {
	id: "q-fallback",
	label: "Q-00",
	matchup: "Fallback Team A vs Fallback Team B",
	waitLabel: "WAIT: 00M",
};

const defaultItem: NextQueueItem = MOCK_NEXT_QUEUE[0] ?? FALLBACK_ITEM;
const longMatchupBase: NextQueueItem = MOCK_NEXT_QUEUE[1] ?? FALLBACK_ITEM;

const meta: Meta<typeof NextQueueRow> = {
	title: "session/NextQueueRow",
	component: NextQueueRow,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof NextQueueRow>;

export const Default: Story = {
	args: { item: defaultItem },
};

export const LongMatchup: Story = {
	args: {
		item: {
			...longMatchupBase,
			matchup: "Very Long Team Names Alpha vs Bravo Championship",
		},
	},
};
