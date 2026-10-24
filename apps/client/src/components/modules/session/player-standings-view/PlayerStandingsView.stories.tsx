import type { Meta, StoryObj } from "@storybook/react";
import {
	MOCK_PLAYER_STANDINGS,
	MOCK_PLAYER_STANDINGS_COPY,
} from "@/constants/mock-player-session";
import { PlayerStandingsView } from "./PlayerStandingsView";

const meta: Meta<typeof PlayerStandingsView> = {
	title: "session/PlayerStandingsView",
	component: PlayerStandingsView,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof PlayerStandingsView>;

export const Default: Story = {
	args: {
		copy: MOCK_PLAYER_STANDINGS_COPY,
		rows: MOCK_PLAYER_STANDINGS,
	},
};
