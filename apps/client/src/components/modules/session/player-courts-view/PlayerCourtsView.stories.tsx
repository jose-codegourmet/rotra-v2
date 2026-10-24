import type { Meta, StoryObj } from "@storybook/react";
import {
	MOCK_PLAYER_COURTS,
	MOCK_PLAYER_COURTS_COPY,
} from "@/constants/mock-player-session";
import { PlayerCourtsView } from "./PlayerCourtsView";

const meta: Meta<typeof PlayerCourtsView> = {
	title: "session/PlayerCourtsView",
	component: PlayerCourtsView,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof PlayerCourtsView>;

export const Default: Story = {
	args: {
		copy: MOCK_PLAYER_COURTS_COPY,
		courts: MOCK_PLAYER_COURTS,
	},
};
