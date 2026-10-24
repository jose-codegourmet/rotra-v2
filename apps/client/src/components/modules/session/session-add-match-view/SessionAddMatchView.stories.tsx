import type { Meta, StoryObj } from "@storybook/react";
import {
	MOCK_ADD_MATCH_POOL,
	MOCK_ADD_MATCH_TEAM_A,
	MOCK_ADD_MATCH_TEAM_B,
	MOCK_SESSION_ADD_MATCH,
} from "@/constants/mock-session-add-match";
import { SessionAddMatchView } from "./SessionAddMatchView";

const meta: Meta<typeof SessionAddMatchView> = {
	title: "session/SessionAddMatchView",
	component: SessionAddMatchView,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
};

export default meta;
type Story = StoryObj<typeof SessionAddMatchView>;

export const Default: Story = {
	args: {
		session: MOCK_SESSION_ADD_MATCH,
		teamA: MOCK_ADD_MATCH_TEAM_A,
		teamB: MOCK_ADD_MATCH_TEAM_B,
		pool: MOCK_ADD_MATCH_POOL,
	},
};
