import type { Meta, StoryObj } from "@storybook/react";
import {
	MOCK_PLAYER_QUEUE_COPY,
	MOCK_PLAYER_QUEUE_NEXT,
	MOCK_PLAYER_QUEUE_ROWS,
} from "@/constants/mock-player-session";
import { PlayerQueueView } from "./PlayerQueueView";

const meta: Meta<typeof PlayerQueueView> = {
	title: "session/PlayerQueueView",
	component: PlayerQueueView,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof PlayerQueueView>;

export const Default: Story = {
	args: {
		copy: MOCK_PLAYER_QUEUE_COPY,
		nextPairing: MOCK_PLAYER_QUEUE_NEXT,
		rows: MOCK_PLAYER_QUEUE_ROWS,
	},
};
